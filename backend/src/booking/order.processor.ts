import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RedisService } from '../redis/redis.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { TicketType } from '../entities/ticket-type.entity';

interface OrderJobData {
  userId: string;
  ticketTypeId: string;
  eventId: string;
  quantity: number;
  idempotencyKey: string;
  unitPrice: number;
}

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

    // tạo transaction đảm bảo order + tickets cùng sống hoặc cùng chết
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // tạo Order mới (status PENDING)
      const order = new Order();
      order.user = { id: userId } as any;
      order.concert = { id: eventId } as any;
      order.ticketType = { id: ticketTypeId } as any;
      order.orderCode = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      order.totalAmount = unitPrice * quantity;
      order.quantity = quantity;
      order.status = OrderStatus.PENDING;
      order.idempotencyKey = idempotencyKey;

      const savedOrder = await queryRunner.manager.save(order);

      // commit transaction
      await queryRunner.commitTransaction();

      // lưu orderId vào Redis để FE polling lấy kết quả
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

      // chỉ trả vé về redis khi đã hết số lần retry (chắc chắn fail)
      if (job.opts.attempts && job.attemptsMade >= job.opts.attempts) {
        // compensating transaction: trả lại vé vào redis
        await this.redisService.rollbackBooking(ticketTypeId, userId, quantity);

        // set kết quả là FAILED để FE ngừng polling
        await this.redisService.setJobResult(idempotencyKey, 'FAILED');
      }

      // ném lỗi để BullMQ xử lý retry
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
