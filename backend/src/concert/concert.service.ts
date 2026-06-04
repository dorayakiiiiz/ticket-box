import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type Redis from 'ioredis';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Concert } from '../entities/concert.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { UserRole } from '../entities/user.entity';
import { CreateConcertDto, UpdateConcertDto } from './dto/concert.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';

const AI_BIO_QUEUE = 'ticketbox.concert.ai-bio';

// Key pattern cho Redis, dùng chung với Phase 3 (booking)
// ticket_type:{id}:available — số vé còn lại của loại vé tương ứng
const redisKey = (ticketTypeId: string) => `ticket_type:${ticketTypeId}:available`;

@Injectable()
export class ConcertService implements OnApplicationBootstrap {
  constructor(
    @InjectPinoLogger(ConcertService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(Concert) private readonly concertRepo: Repository<Concert>,
    @InjectRepository(TicketType) private readonly ticketTypeRepo: Repository<TicketType>,
    @InjectQueue(AI_BIO_QUEUE) private readonly aiBioQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // ─── Lifecycle Hook ──────────────────────────────────────────────────────────

  // Khi NestJS khởi động, seed Redis với toàn bộ TicketType từ Postgres
  // Seed Redis khi server khởi động để tránh cold miss lần đầu tiên
  // Dùng SET NX (SET if Not eXists) để không ghi đè giá trị đang live
  async onApplicationBootstrap() {
    try {
      const types = await this.ticketTypeRepo.find();
      if (types.length === 0) return;

      const pipeline = this.redis.pipeline();
      for (const t of types) {
        const available = t.totalQuantity - t.soldQuantity;
        // SET NX: chỉ set nếu key chưa tồn tại — không overwrite data đang live
        pipeline.set(redisKey(t.id), available, 'NX');
      }
      await pipeline.exec();

      this.logger.info(`Redis warm-up: ${types.length} ticket type(s) seeded`);
    } catch (err) {
      // Warm-up thất bại không được block server start — chỉ log warn
      // Availability endpoint có fallback về Postgres khi Redis miss
      this.logger.warn({ err }, 'Redis warm-up failed — will fallback on demand');
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  findAll() {
    return this.concertRepo.find({ relations: { ticketTypes: true } });
  }

  async findOne(id: string) {
    const concert = await this.concertRepo.findOne({ where: { id }, relations: { ticketTypes: true } });
    if (!concert) throw new NotFoundException('Concert không tồn tại');
    return concert;
  }

  async create(dto: CreateConcertDto, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền tạo concert');
    }
    const concert = this.concertRepo.create(dto);
    return this.concertRepo.save(concert);
  }

  async update(id: string, dto: UpdateConcertDto, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền cập nhật concert');
    }
    await this.findOne(id); // throw 404 nếu không tồn tại
    await this.concertRepo.update(id, dto as any);
    return this.findOne(id);
  }

  async uploadBio(id: string, file: Express.Multer.File, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền upload');
    }

    const concert = await this.findOne(id);

    // Chặn upload trùng — tránh race condition 2 worker chạy song song
    if (concert.aiBioStatus === 'PROCESSING') {
      throw new ConflictException('AI Bio đang được xử lý, vui lòng chờ');
    }

    await this.concertRepo.update(id, { aiBioStatus: 'PROCESSING' });

    await this.aiBioQueue.add(
      'process-pdf-bio',
      { concertId: id, pdfBuffer: file.buffer.toString('base64') },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: { count: 100 }, // Giữ tối đa 100 failed jobs để debug
      },
    );

    return { message: 'AI Bio đang được xử lý' };
  }

  // Reset status kẹt PROCESSING → IDLE để upload lại
  async resetBioStatus(id: string, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền thao tác');
    }
    const concert = await this.findOne(id);
    if (concert.aiBioStatus !== 'PROCESSING' && concert.aiBioStatus !== 'FAILED') {
      throw new ConflictException('Chỉ reset được khi đang PROCESSING hoặc FAILED');
    }
    await this.concertRepo.update(id, { aiBioStatus: 'IDLE', aiBio: '' });
    return { message: 'Đã reset AI Bio status' };
  }

  async remove(id: string, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền xóa concert');
    }
    const concert = await this.findOne(id);
    await this.concertRepo.remove(concert);
  }

  // ─── Availability (đọc từ Redis, fallback Postgres) ──────────────────────────

  // Public endpoint, dùng bởi SWR client poll 5 giây.
  // Ưu tiên đọc Redis vì nhanh (O(1)), nếu cache miss thì fallback về Postgres và tự SET lại Redis.
  async getAvailability(concertId: string) {
    const concert = await this.findOne(concertId);

    const ticketTypes = await Promise.all(
      concert.ticketTypes.map(async (t) => {
        // Đọc từ Redis trước
        const raw = await this.redis.get(redisKey(t.id));

        let available: number;
        if (raw !== null) {
          available = parseInt(raw, 10);
        } else {
          // Cold miss — tính từ Postgres và SET Redis để warm cache
          available = t.totalQuantity - t.soldQuantity;
          await this.redis.set(redisKey(t.id), available);
          this.logger.debug(`Cache miss: warmed ticket_type:${t.id}:available = ${available}`);
        }

        return {
          id: t.id,
          name: t.name,
          colorCode: t.colorCode,
          totalQuantity: t.totalQuantity,
          available,
          soldOut: available <= 0,
        };
      }),
    );

    return {
      concertId,
      updatedAt: new Date().toISOString(),
      ticketTypes,
    };
  }
}
