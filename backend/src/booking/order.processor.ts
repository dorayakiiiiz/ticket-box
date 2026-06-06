import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RedisService } from '../redis/redis.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { TicketType } from '../entities/ticket-type.entity';

/**
 * Dữ liệu job từ BookingService.handleBooking() đẩy vào queue
 */
interface OrderJobData {
  userId: string;
  ticketTypeId: string;
  eventId: string;
  quantity: number;
  idempotencyKey: string;
  unitPrice: number;
}

/**
 * OrderProcessor — Background Worker lắng nghe queue 'ticketbox.order'
 *
 * Nhiệm vụ: Nhận job từ queue, mở Postgres transaction, tạo Order + Tickets
 * Worker chạy ngầm, từ từ xử lý, không gây quá tải Postgres dù có 80k đơn
 *
 * Flow:
 * 1. Mở transaction Postgres
 * 2. Tạo Order (status: PENDING)
 * 2. Tạo Order (status: PENDING)
 * 4. Cập nhật TicketType.soldQuantity (đồng bộ Postgres với Redis)
 * 5. Commit transaction
 * 6. Lưu orderId vào Redis để FE polling lấy được kết quả
 *
 * Nếu lỗi: Rollback transaction + Compensating transaction trả vé lại Redis
 */
@Processor('ticketbox.order')
export class OrderProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(OrderProcessor.name)
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async process(job: Job<OrderJobData>): Promise<any> {
    const { userId, ticketTypeId, eventId, quantity, idempotencyKey, unitPrice } = job.data;

    this.logger.info(
      `Processing order job ${job.id}: user=${userId}, ticketType=${ticketTypeId}, qty=${quantity}`,
    );

    // Mở transaction: đảm bảo Order + Tickets cùng sống hoặc cùng chết
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Tạo Order mới (status PENDING — chờ thanh toán Phase 4)
      const order = new Order();
      order.user = { id: userId } as any; // Chỉ set FK, không cần load full entity
      order.concert = { id: eventId } as any;
      order.ticketType = { id: ticketTypeId } as any; // FK cho PaymentService + CronService truy vết
      order.orderCode = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      order.totalAmount = unitPrice * quantity;
      order.quantity = quantity;
      order.status = OrderStatus.PENDING;
      order.idempotencyKey = idempotencyKey;

      const savedOrder = await queryRunner.manager.save(order);



      // 3. Cập nhật soldQuantity trong Postgres (đồng bộ với Redis counter)
      await queryRunner.manager.increment(
        TicketType,
        { id: ticketTypeId },
        'soldQuantity',
        quantity,
      );

      // 4. Commit transaction
      await queryRunner.commitTransaction();

      // 5. Lưu orderId vào Redis để FE polling lấy kết quả
      await this.redisService.setJobResult(idempotencyKey, savedOrder.id);

      this.logger.info(
        `Order ${savedOrder.id} created successfully — ${quantity} ticket(s) for user ${userId}`,
      );

      return { orderId: savedOrder.id };

    } catch (err) {
      // Rollback Postgres transaction
      await queryRunner.rollbackTransaction();

      this.logger.error(
        { err },
        `Order job ${job.id} failed — rolling back Redis booking`,
      );

      // Compensating transaction: trả lại vé vào Redis
      // Vì Lua Script đã trừ vé nhưng Postgres insert thất bại,
      // phải hoàn vé để không mất vé "ảo"
      await this.redisService.rollbackBooking(ticketTypeId, userId, quantity);

      // Nếu đây là lần thử cuối cùng (hoặc vượt quá), set kết quả là FAILED để FE ngừng polling
      if (job.opts.attempts && job.attemptsMade >= job.opts.attempts) {
        await this.redisService.setJobResult(idempotencyKey, 'FAILED');
      }

      throw err; // Re-throw để BullMQ biết job failed và retry
    } finally {
      await queryRunner.release();
    }
  }
}
