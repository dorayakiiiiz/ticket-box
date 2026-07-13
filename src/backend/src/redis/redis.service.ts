import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class RedisService implements OnModuleInit {
  // SHA hash của Lua script, dùng EVALSHA thay vì EVAL để tiết kiệm bandwidth
  private bookTicketScriptSha: string;
  // lưu nội dung script để fallback khi bị lỗi NOSCRIPT
  private bookTicketScriptContent: string;

  constructor(
    @InjectPinoLogger(RedisService.name)
    private readonly logger: PinoLogger,
    @InjectRedis() private readonly redis: Redis,
  ) { }

  // khi app khởi động, load Lua script vào bộ nhớ redis
  // redis trả về SHA1 hash, sau đó dùng EVALSHA (nhanh hơn EVAL)
  async onModuleInit() {
    try {
      const scriptPath = path.join(__dirname, 'lua', 'book-ticket.lua');
      this.bookTicketScriptContent = fs.readFileSync(scriptPath, 'utf8');
      this.bookTicketScriptSha = await this.redis.script('LOAD', this.bookTicketScriptContent) as string;
      this.logger.info('Lua script [book-ticket] loaded successfully');
    } catch (err) {
      this.logger.error({ err }, 'Failed to load Lua script [book-ticket]');
    }
  }


  async processBooking(
    ticketTypeId: string,
    userId: string,
    quantity: number,
    maxPerUser: number,
  ): Promise<string> {
    const ticketKey = `ticket_type:${ticketTypeId}:available`;
    const userLimitKey = `user:${userId}:ticket_type:${ticketTypeId}:tickets_held`;

    try {
      if (!this.bookTicketScriptSha) {
        throw new Error('NOSCRIPT Script SHA is undefined');
      }
      return await this.redis.evalsha(
        this.bookTicketScriptSha,
        2,
        ticketKey, userLimitKey,
        quantity, maxPerUser,
      ) as string;
    } catch (err: any) {
      if (err.message && err.message.includes('NOSCRIPT')) {
        this.logger.warn('NOSCRIPT caught, falling back to EVAL and re-loading script...');
        const result = await this.redis.eval(
          this.bookTicketScriptContent,
          2,
          ticketKey, userLimitKey,
          quantity, maxPerUser,
        ) as string;

        // Cố gắng re-load script vào cache Redis cho các lần sau
        this.bookTicketScriptSha = await this.redis.script('LOAD', this.bookTicketScriptContent) as string;
        return result;
      }
      throw err;
    }
  }

  // Idempotency: Chặn double-click
  async checkIdempotency(key: string): Promise<boolean> {
    const result = await this.redis.set(
      `idempotency:${key}`,
      'processing',
      'EX', 3600,
      'NX',
    );
    return result === 'OK';
  }

  async setJobResult(idempotencyKey: string, orderId: string): Promise<void> {
    await this.redis.set(`job_result:${idempotencyKey}`, orderId, 'EX', 3600);
  }

  async getJobResult(idempotencyKey: string): Promise<string | null> {
    return this.redis.get(`job_result:${idempotencyKey}`);
  }

  // Hoàn vé khi Worker lỗi 
  async rollbackBooking(
    ticketTypeId: string,
    userId: string,
    quantity: number,
  ): Promise<void> {
    const ticketKey = `ticket_type:${ticketTypeId}:available`;
    const userLimitKey = `user:${userId}:ticket_type:${ticketTypeId}:tickets_held`;

    // gộp 2 lệnh thành 1 round-trip network
    const pipeline = this.redis.pipeline();
    pipeline.incrby(ticketKey, quantity);   // Cộng lại vé
    pipeline.decrby(userLimitKey, quantity); // Giảm counter user
    await pipeline.exec();

    this.logger.warn(
      `Rollback booking: returned ${quantity} ticket(s) for ticketType=${ticketTypeId}, user=${userId}`,
    );
  }

  // Tạo Distributed Lock (Khóa phân tán) bằng Redis SET NX
  // Dùng để ngăn chặn nhiều server cùng chạy 1 cronjob (tránh Race Condition)
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, 'locked', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
}
