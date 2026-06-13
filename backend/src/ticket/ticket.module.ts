import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { Order } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';
import { AuthModule } from '../auth/auth.module';
import { Concert } from '../entities/concert.entity';
import { SyncCheckinProcessor } from './sync.processor';  

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Ticket, Concert]),
    AuthModule,
    //Đăng ký queue cho sync check-in
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
  controllers: [TicketController],
  providers: [
    TicketService,
    SyncCheckinProcessor, 
  ],
})
export class TicketModule {}