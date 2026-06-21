import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * RedisService — trung tâm xử lý Redis cho toàn bộ Phase 3
 *
 * Chức năng:
 * 1. Load và cache Lua Script SHA khi server khởi động (SCRIPT LOAD)
 * 2. processBooking(): chạy Lua Script atomic trừ vé + check user limit
 * 3. checkIdempotency(): SET NX để chặn double-click
 * 4. setJobResult() / getJobResult(): lưu/đọc orderId cho FE polling
 * 5. rollbackBooking(): compensating transaction khi worker thất bại
 */
@Injectable()
export class RedisService implements OnModuleInit {
  // SHA hash của Lua script — dùng EVALSHA thay vì EVAL để tiết kiệm bandwidth
  private bookTicketScriptSha: string;

  constructor(
    @InjectPinoLogger(RedisService.name)
    private readonly logger: PinoLogger,
    @InjectRedis() private readonly redis: Redis,
  ) { }

  // Khi NestJS khởi động, load Lua script vào bộ nhớ Redis
  // Redis trả về SHA1 hash — sau đó dùng EVALSHA (nhanh hơn EVAL)
  async onModuleInit() {
    try {
      const scriptPath = path.join(__dirname, 'lua', 'book-ticket.lua');
      const script = fs.readFileSync(scriptPath, 'utf8');
      this.bookTicketScriptSha = await this.redis.script('LOAD', script) as string;
      this.logger.info('Lua script [book-ticket] loaded successfully');
    } catch (err) {
      // Không block server start — nhưng booking sẽ fail nếu script chưa load
      this.logger.error({ err }, 'Failed to load Lua script [book-ticket]');
    }
  }


  async processBooking(
    ticketTypeId: string,
    userId: string,
    quantity: number,
    maxPerUser: number,
  ): Promise<string> {
    // Key pattern khớp với Phase 2: ticket_type:{id}:available (đã được seed)
    const ticketKey = `ticket_type:${ticketTypeId}:available`;
    const userLimitKey = `user:${userId}:ticket_type:${ticketTypeId}:tickets_held`;

    const result = await this.redis.evalsha(
      this.bookTicketScriptSha,
      2, // Số lượng KEYS
      ticketKey, userLimitKey, // KEYS[1], KEYS[2]
      quantity, maxPerUser,   // ARGV[1], ARGV[2]
    );

    return result as string;
  }

  // Idempotency: Chặn double-click
  async checkIdempotency(key: string): Promise<boolean> {
    // SET NX: chỉ set nếu key chưa tồn tại
    // EX 3600: expire sau 1 tiếng 
    const result = await this.redis.set(
      `idempotency:${key}`,
      'processing',
      'EX', 3600,
      'NX',
    );
    // Redis trả 'OK' nếu set thành công, null nếu key đã tồn tại
    return result === 'OK';
  }


  async setJobResult(idempotencyKey: string, orderId: string): Promise<void> {
    // Expire sau 1h, FE sẽ poll trong vài giây, key không cần giữ lâu
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

    // Pipeline: gộp 2 lệnh thành 1 round-trip network
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
