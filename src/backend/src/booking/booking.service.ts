import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RedisService } from '../redis/redis.service';
import { TicketType } from '../entities/ticket-type.entity';
import { Order } from '../entities/order.entity';

const ORDER_QUEUE = 'ticketbox.order';

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
  ) { }


  // xử lý booking request, gọi sau khi đã qua rate limit + idempotency guard
  async handleBooking(
    userId: string,
    ticketTypeId: string,
    quantity: number,
    idempotencyKey: string,
  ) {
    // lấy thông tin loại vé từ postgres (maxPerUser, price, concertId)
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

    // gọi redis lua script - atomic: check limit + check available + deduct
    const luaResult = await this.redisService.processBooking(
      ticketTypeId,
      userId,
      quantity,
      maxPerUser,
    );

    this.logger.info(
      `Booking Lua result: ${luaResult} — user=${userId}, ticketType=${ticketTypeId}, qty=${quantity}`,
    );

    // xử lý kết quả từ Lua Script
    if (luaResult === 'SOLD_OUT') {
      throw new BadRequestException('Rất tiếc, loại vé này đã hết!');
    }

    if (luaResult === 'LIMIT_EXCEEDED') {
      throw new BadRequestException(
        `Bạn đã mua vượt quá giới hạn ${maxPerUser} vé cho loại vé này!`,
      );
    }

    // success - đẩy job vào bullmq queue trước rồi mới trả response
    const job = await this.orderQueue.add('create-order', {
      userId,
      ticketTypeId,
      eventId,
      quantity,
      idempotencyKey,
      unitPrice: ticketType.price,
    }, {
      attempts: 3, // retry tối đa 3 lần nếu worker fail
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: { count: 200 }, // giữ 200 failed jobs để debug
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

  // kiểm tra order đã được Worker tạo xong chưa
  // ưu tiên đọc từ redis (nhanh), fallback postgres nếu redis miss
  async checkBookingStatus(idempotencyKey: string) {
    // check redis trước (nhanh O(1))
    const orderId = await this.redisService.getJobResult(idempotencyKey);

    if (orderId === 'FAILED') {
      return { status: 'failed', orderId: null };
    }

    if (orderId) {
      return { status: 'completed', orderId };
    }

    // fallback: check postgres (phòng trường hợp redis key expired)
    const order = await this.orderRepo.findOne({
      where: { idempotencyKey },
    });

    if (order) {
      return { status: 'completed', orderId: order.id };
    }

    // chưa xong - Worker đang xử lý
    return { status: 'processing', orderId: null };
  }
}
