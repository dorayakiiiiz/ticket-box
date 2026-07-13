import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Concert } from '../entities/concert.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { ConcertService } from './concert.service';
import { ConcertController } from './concert.controller';
import { AiBioProcessor } from './ai-bio.processor';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { Order } from '../entities/order.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Concert, TicketType, Order]), // TicketType cần cho warm-up, Order cho tính pending vé
    BullModule.registerQueue({ name: 'ticketbox.concert.ai-bio' }),
    AiProviderModule,
    StorageModule, // Cho phép ConcertService inject StorageService
  ],
  providers: [ConcertService, AiBioProcessor],
  controllers: [ConcertController],
  exports: [ConcertService], // Export để ConcertService có thể dùng ConfigService trong module khác nếu cần
})
export class ConcertModule {}
