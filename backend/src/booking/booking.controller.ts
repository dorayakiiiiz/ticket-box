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
import { CaptchaGuard } from '../common/guards/captcha.guard';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/booking.dto';
import { Public } from '../common/guards/jwt.strategy';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) { }

  // POST /booking — Đặt vé (cần auth + rate limit + idempotency)
  @Post()
  @UseGuards(ThrottlerGuard, CaptchaGuard, IdempotencyGuard)
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

  // GET /booking/status?key=<idempotencyKey>
  @Get('status')
  async checkStatus(@Query('key') idempotencyKey: string) {
    if (!idempotencyKey) {
      return { status: 'error', message: 'Thiếu query param key' };
    }

    return this.bookingService.checkBookingStatus(idempotencyKey);
  }
}
