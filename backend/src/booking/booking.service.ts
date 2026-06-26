import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RedisService } from '../redis/redis.service';
import { TicketType } from '../entities/ticket-type.entity';
import { Order } from '../entities/order.entity';

// Tên queue — phải khớp với BullModule.registerQueue() trong BookingModule
const ORDER_QUEUE = 'ticketbox.order';

/**
 * BookingService — xử lý logic nghiệp vụ đặt vé Phase 3
 *
 * Flow:
 * 1. Validate ticketTypeId → lấy maxPerUser + concertId từ Postgres
 * 2. Gọi Redis Lua Script (atomic): check user limit → check availability → deduct
 * 3. Nếu SUCCESS → đẩy job vào BullMQ queue, trả jobId cho FE
 * 4. Nếu SOLD_OUT / LIMIT_EXCEEDED → throw lỗi ngay
 */
@Injectable()
export class BookingService {
  constructor(
    @InjectPinoLogger(BookingService.name)
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectQueue(ORDER_QUEUE) private readonly orderQueue: Queue,
  ) {}

  /**
   * Xử lý booking request — gọi sau khi đã qua Rate Limit + Idempotency Guard
   *
   * @param userId - UUID user (từ JWT payload)
   * @param ticketTypeId - UUID loại vé muốn mua
   * @param quantity - Số lượng vé
   * @param idempotencyKey - UUID từ FE header
   */
  async handleBooking(
    userId: string,
    ticketTypeId: string,
    quantity: number,
    idempotencyKey: string,
  ) {
    // 1. Lấy thông tin loại vé từ Postgres (maxPerUser, price, concertId)
    const ticketType = await this.ticketTypeRepo.findOne({
      where: { id: ticketTypeId },
      relations: { concert: true },
    });

    if (!ticketType) {
      throw new NotFoundException('Loại vé không tồn tại');
    }

    if (!ticketType.concert) {
      throw new NotFoundException('Concert của loại vé này không tồn tại');
    }

    if (ticketType.concert.openTime && new Date() < new Date(ticketType.concert.openTime)) {
      throw new BadRequestException('Sự kiện chưa đến thời gian mở bán vé');
    }

    const eventId = ticketType.concert.id;
    const maxPerUser = ticketType.maxPerUser;

    // 2. Gọi Redis Lua Script — atomic: check limit + check available + deduct
    const luaResult = await this.redisService.processBooking(
      ticketTypeId,
      userId,
      quantity,
      maxPerUser,
    );

    this.logger.info(
      `Booking Lua result: ${luaResult} — user=${userId}, ticketType=${ticketTypeId}, qty=${quantity}`,
    );

    // 3. Xử lý kết quả từ Lua Script
    if (luaResult === 'SOLD_OUT') {
      throw new BadRequestException('Rất tiếc, loại vé này đã hết!');
    }

    if (luaResult === 'LIMIT_EXCEEDED') {
      throw new BadRequestException(
        `Bạn đã mua vượt quá giới hạn ${maxPerUser} vé cho loại vé này!`,
      );
    }

    // 4. SUCCESS — Đẩy job vào BullMQ queue TRƯỚC rồi mới trả response
    // Lý do: nếu trả FE thành công trước mà queue fail → mất đơn hàng
    const job = await this.orderQueue.add('create-order', {
      userId,
      ticketTypeId,
      eventId,
      quantity,
      idempotencyKey,
      unitPrice: ticketType.price,
    }, {
      attempts: 3, // Retry tối đa 3 lần nếu worker fail
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: { count: 200 }, // Giữ 200 failed jobs để debug
    });

    this.logger.info(
      `Job ${job.id} added to queue — user=${userId}, ticketType=${ticketTypeId}`,
    );

    return {
      status: 'SUCCESS',
      message: 'Giữ vé thành công! Đang tạo đơn hàng...',
      jobId: job.id,
      idempotencyKey,
    };
  }

  /**
   * FE polling: kiểm tra order đã được Worker tạo xong chưa
   * Ưu tiên đọc từ Redis (nhanh), fallback Postgres nếu Redis miss
   */
  async checkBookingStatus(idempotencyKey: string) {
    // 1. Check Redis trước (nhanh O(1))
    const orderId = await this.redisService.getJobResult(idempotencyKey);

    if (orderId === 'FAILED') {
      return { status: 'failed', orderId: null };
    }

    if (orderId) {
      return { status: 'completed', orderId };
    }

    // 2. Fallback: check Postgres (phòng trường hợp Redis key expired)
    const order = await this.orderRepo.findOne({
      where: { idempotencyKey },
    });

    if (order) {
      return { status: 'completed', orderId: order.id };
    }

    // 3. Chưa xong — Worker đang xử lý
    return { status: 'processing', orderId: null };
  }
}
