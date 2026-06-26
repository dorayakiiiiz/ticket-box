import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { OrderProcessor } from './order.processor';
import { TicketRedisModule } from '../redis/redis.module';
import { TicketType } from '../entities/ticket-type.entity';
import { Order } from '../entities/order.entity';

/**
 * BookingModule — module đặt vé Phase 3
 *
 * Imports:
 * - TypeOrmModule: TicketType (đọc maxPerUser, price), Order (polling fallback)
 * - BullModule: đăng ký queue 'ticketbox.order' cho Worker
 * - TicketRedisModule: inject RedisService (Lua Script, Idempotency, Job Result)
 *
 * Providers:
 * - BookingService: logic nghiệp vụ
 * - OrderProcessor: BullMQ Worker xử lý tạo order trong Postgres
 */
import { Concert } from '../entities/concert.entity';
import { CronService } from './cron.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketType, Order, Concert]),
    BullModule.registerQueue({ name: 'ticketbox.order' }),
    BullModule.registerQueue({ name: 'notification-queue' }),
    TicketRedisModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, OrderProcessor, CronService],
})
export class BookingModule {}
