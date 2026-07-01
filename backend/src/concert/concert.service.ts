import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type Redis from 'ioredis';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { Concert } from '../entities/concert.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { UserRole } from '../entities/user.entity';
import { CreateConcertDto, UpdateConcertDto } from './dto/concert.dto';
import { CreateTicketTypeDto, UpdateTicketTypeDto } from './dto/ticket-type.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { StorageService } from '../storage/storage.service';

const AI_BIO_QUEUE = 'ticketbox.concert.ai-bio';


// Key pattern cho Redis, dùng chung với Phase 3 (booking)
// ticket_type:{id}:available — số vé còn lại của loại vé tương ứng
const redisKey = (ticketTypeId: string) => `ticket_type:${ticketTypeId}:available`;

// Config map: ánh xạ type → bucket Supabase + column DB
// Tập trung tại 1 chỗ — thêm loại ảnh mới chỉ cần thêm 1 entry
const IMAGE_CONFIG = {
  cover:   { bucket: 'cover-images', prefix: 'cover',    dbField: 'coverImageUrl'   as const },
  seatMap: { bucket: 'seat-maps',    prefix: 'seat-map', dbField: 'seatMapImageUrl' as const },
} as const;

type ImageType = keyof typeof IMAGE_CONFIG;

@Injectable()
export class ConcertService implements OnApplicationBootstrap {
  constructor(
    @InjectPinoLogger(ConcertService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(Concert) private readonly concertRepo: Repository<Concert>,
    @InjectRepository(TicketType) private readonly ticketTypeRepo: Repository<TicketType>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectQueue(AI_BIO_QUEUE) private readonly aiBioQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}


  // Hàm tính toán số lượng vé thực tế từ DB bao gồm cả vé đang bị giam (PENDING)
  private async calculateAvailableFromDB(ticketType: TicketType): Promise<number> {
    const expirationThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 phút
    
    // Tìm các đơn hàng PENDING chưa hết hạn của loại vé này
    const pendingOrders = await this.orderRepo.find({
      where: {
        ticketType: { id: ticketType.id },
        status: OrderStatus.PENDING,
        createdAt: MoreThan(expirationThreshold),
      },
    });

    // Tính tổng số lượng vé đang bị giam
    const pendingQuantity = pendingOrders.reduce((sum, order) => sum + order.quantity, 0);

    // Tính số vé còn lại: Tổng - Đã bán (PAID) - Đang giam (PENDING)
    return ticketType.totalQuantity - ticketType.soldQuantity - pendingQuantity;
  }

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
        // [FIXED] Tính vé bằng hàm chính xác để tránh Overselling
        const available = await this.calculateAvailableFromDB(t);
        
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

  // Trả paginated khi có page/limit, trả hết khi không — backward compatible với public ISR
  async findAll(options?: { page?: number; limit?: number; search?: string; status?: string; city?: string }) {
    const { page, limit, search, status, city } = options || {};

    // Public page (ISR) gọi không truyền params → trả toàn bộ
    if (!page || !limit) {
      return this.concertRepo.find({ relations: { ticketTypes: true } });
    }

    const qb = this.concertRepo.createQueryBuilder('concert')
      .leftJoinAndSelect('concert.ticketTypes', 'ticketType')
      .orderBy('concert.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (search) {
      qb.andWhere(
        '(concert.name ILIKE :search OR concert.city ILIKE :search OR concert.venue ILIKE :search OR concert.subtitle ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Lọc theo trạng thái — khớp chính xác enum
    if (status) {
      qb.andWhere('concert.status = :status', { status });
    }

    // Lọc theo thành phố — ILIKE để không phân biệt hoa/thường
    if (city) {
      qb.andWhere('concert.city ILIKE :city', { city: `%${city}%` });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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
    if (concert.aiStatus === 'PROCESSING') {
      throw new ConflictException('AI Bio đang được xử lý, vui lòng chờ');
    }

    await this.concertRepo.update(id, { aiStatus: 'PROCESSING' });

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
    if (concert.aiStatus !== 'PROCESSING' && concert.aiStatus !== 'FAILED') {
      throw new ConflictException('Chỉ reset được khi đang PROCESSING hoặc FAILED');
    }
    await this.concertRepo.update(id, { aiStatus: 'IDLE' });
    return { message: 'Đã reset AI Bio status' };
  }

  // ─── Image Uploads ────────────────────────────────────────────────────────────

  /**
   * Hàm upload ảnh duy nhất dùng chung cho cover và seat map.
   * - Garbage Collection: xóa file cũ trên Supabase trước khi lưu URL mới.
   * - Ưu tiên delete best-effort: nếu delete thất bại, vẫn tiếp tục upload ảnh mới.
   */
  async uploadImage(
    id: string,
    file: Express.Multer.File,
    type: ImageType,
    user: { id: string; role: UserRole },
  ): Promise<{ imageUrl: string }> {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền upload ảnh');
    }

    const concert = await this.findOne(id);
    const cfg = IMAGE_CONFIG[type];

    // ── Garbage Collection ────────────────────────────────────────────────────
    // Lấy URL cũ từ DB, nếu có thì xóa file cũ trên Supabase trước khi upload mới
    const oldUrl = concert[cfg.dbField] as string | null;
    if (oldUrl) {
      try {
        await this.storageService.deleteImage(cfg.bucket, oldUrl);
      } catch (err) {
        // Best-effort: log warning nhưng không block upload ảnh mới
        this.logger.warn({ err, oldUrl, type }, 'GC: failed to delete old image — continuing');
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${cfg.prefix}_${id}_${Date.now()}.${ext}`;
    const imageUrl = await this.storageService.uploadImage(cfg.bucket, fileName, file);

    await this.concertRepo.update(id, { [cfg.dbField]: imageUrl });
    this.logger.info({ concertId: id, type, imageUrl }, 'Image uploaded');
    return { imageUrl };
  }


  async remove(id: string, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền xóa concert');
    }
    const concert = await this.findOne(id);
    
    // [FIXED] Dùng softRemove thay vì remove cứng để bảo vệ dữ liệu tài chính (Order, Ticket)
    await this.concertRepo.softRemove(concert);
  }

  // ─── Ticket Type CRUD ────────────────────────────────────────────────────────

  async createTicketType(
    concertId: string,
    dto: CreateTicketTypeDto,
    user: { id: string; role: UserRole },
  ): Promise<TicketType> {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền thêm loại vé');
    }
    const concert = await this.findOne(concertId); // 404 nếu concert không tồn tại

    const ticketType = this.ticketTypeRepo.create({ ...dto, concert });
    const saved = await this.ticketTypeRepo.save(ticketType);

    // Seed Redis ngay — nhất quán với onApplicationBootstrap
    await this.redis.set(redisKey(saved.id), dto.totalQuantity);
    this.logger.info(`Created ticket type ${saved.id} for concert ${concertId}, seeded Redis = ${dto.totalQuantity}`);

    return saved;
  }

  async updateTicketType(
    concertId: string,
    typeId: string,
    dto: UpdateTicketTypeDto,
    user: { id: string; role: UserRole },
  ): Promise<TicketType> {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền cập nhật loại vé');
    }

    const ticketType = await this.ticketTypeRepo.findOne({
      where: { id: typeId, concert: { id: concertId } },
    });
    if (!ticketType) throw new NotFoundException('Loại vé không tồn tại');

    // Guard: không được giảm totalQuantity xuống dưới số đã bán
    if (dto.totalQuantity !== undefined && dto.totalQuantity < ticketType.soldQuantity) {
      throw new BadRequestException(
        `Không thể giảm số lượng xuống ${dto.totalQuantity} vì đã bán ${ticketType.soldQuantity} vé`,
      );
    }

    // Sync Redis nếu totalQuantity thay đổi: dùng INCRBY để giữ đồng bộ với booking flow
    if (dto.totalQuantity !== undefined && dto.totalQuantity !== ticketType.totalQuantity) {
      const delta = dto.totalQuantity - ticketType.totalQuantity;
      await this.redis.incrby(redisKey(typeId), delta);
      this.logger.info(`Updated ticket type ${typeId} totalQuantity delta=${delta}, Redis synced`);
    }

    await this.ticketTypeRepo.update(typeId, dto);
    return this.ticketTypeRepo.findOne({ where: { id: typeId } }) as Promise<TicketType>;
  }

  async removeTicketType(
    concertId: string,
    typeId: string,
    user: { id: string; role: UserRole },
  ): Promise<void> {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền xóa loại vé');
    }

    const ticketType = await this.ticketTypeRepo.findOne({
      where: { id: typeId, concert: { id: concertId } },
    });
    if (!ticketType) throw new NotFoundException('Loại vé không tồn tại');

    // Guard: chặn xóa nếu còn Order PAID hoặc PENDING chưa hết hạn
    const activeOrderCount = await this.orderRepo.count({
      where: [
        { ticketType: { id: typeId }, status: OrderStatus.PAID },
        { ticketType: { id: typeId }, status: OrderStatus.PENDING },
      ],
    });
    if (activeOrderCount > 0) {
      throw new ConflictException(
        `Không thể xóa loại vé đang có ${activeOrderCount} đơn hàng`,
      );
    }

    // Xóa Redis key trước để đảm bảo availability endpoint không trả stale data
    await this.redis.del(redisKey(typeId));
    await this.ticketTypeRepo.remove(ticketType);
    this.logger.info(`Removed ticket type ${typeId} from concert ${concertId}`);
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
          // [FIXED] Tính vé bằng hàm chính xác để tránh Overselling
          available = await this.calculateAvailableFromDB(t);
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
