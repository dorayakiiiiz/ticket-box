// backend/src/guest/guest.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq'; 
import { Concert } from '../entities/concert.entity';
import { Order } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { Guest } from '../entities/guest.entity';
import { GuestService } from './guest.service';
import { GuestController } from './guest.controller';
import { GuestSyncProcessor } from './guest-sync.processor'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Concert, Order, Ticket, User, Guest]),
    BullModule.registerQueue({
      name: 'ticketbox.sync-checkins',  // Tên queue
      defaultJobOptions: {
        attempts: 3,           // Thử lại 3 lần nếu fail
        backoff: 5000,        // Chờ 5 giây rồi thử lại
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [
    GuestService,
    GuestSyncProcessor, // ✅ Thêm processor vào providers
  ],
  controllers: [GuestController],
  exports: [GuestService],
})
export class GuestModule {}