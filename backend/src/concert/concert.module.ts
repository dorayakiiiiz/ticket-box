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


@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Concert, TicketType]), // TicketType cần cho warm-up
    BullModule.registerQueue({ name: 'ticketbox.concert.ai-bio' }),
    AiProviderModule,
  ],
  providers: [ConcertService, AiBioProcessor],
  controllers: [ConcertController],
})
export class ConcertModule { }
