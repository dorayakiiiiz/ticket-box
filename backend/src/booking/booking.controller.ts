import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { IdempotencyGuard } from '../common/guards/idempotency.guard';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/booking.dto';
import { Public } from '../common/guards/jwt.strategy';

/**
 * BookingController — API endpoints cho flow đặt vé Phase 3
 *
 * POST /booking — Đặt vé (cần auth + rate limit + idempotency)
 * GET  /booking/status — FE polling kiểm tra order đã tạo xong chưa
 */
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * POST /booking — Endpoint đặt vé chính
   *
   * Guard chain (thứ tự thực thi):
   * 1. JwtAuthGuard (global) — xác thực user
   * 2. ThrottlerGuard — rate limit 3 req/giây/user, chặn bot
   * 3. IdempotencyGuard — chặn double-click bằng Redis SET NX
   *
   * Body: { ticketTypeId: string, quantity: number }
   * Header: Idempotency-Key: <UUID>
   *
   * Response 202: { status, message, jobId, idempotencyKey }
   * Response 400: Hết vé / Vượt limit
   * Response 409: Request trùng lặp
   * Response 429: Rate limit exceeded
   */
  @Post()
  @UseGuards(ThrottlerGuard, IdempotencyGuard)
  @Throttle({ default: { limit: 3, ttl: 1000 } }) // Tối đa 3 request / 1 giây
  @HttpCode(HttpStatus.ACCEPTED) // 202 — "Đang xử lý"
  async bookTickets(
    @Req() req: any,
    @Body() body: CreateBookingDto,
  ) {
    // userId lấy từ JWT payload (đã được JwtAuthGuard gán vào req.user)
    const userId = req.user.id;
    const idempotencyKey = req.headers['idempotency-key'];

    return this.bookingService.handleBooking(
      userId,
      body.ticketTypeId,
      body.quantity,
      idempotencyKey,
    );
  }

  /**
   * GET /booking/status?key=<idempotencyKey>
   *
   * FE polling endpoint — gọi mỗi 2 giây sau khi POST /booking trả 202
   * Kiểm tra Worker đã tạo order trong Postgres xong chưa
   *
   * Response: { status: 'processing' | 'completed', orderId: string | null }
   */
  @Get('status')
  async checkStatus(@Query('key') idempotencyKey: string) {
    if (!idempotencyKey) {
      return { status: 'error', message: 'Thiếu query param key' };
    }

    return this.bookingService.checkBookingStatus(idempotencyKey);
  }
}
