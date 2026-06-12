import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { Order } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';
import { AuthModule } from '../auth/auth.module';
import { Concert } from '../entities/concert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Ticket, Concert]), AuthModule],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
