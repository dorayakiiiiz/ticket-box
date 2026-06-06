import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from '../entities/ticket.entity';
import { Order } from '../entities/order.entity';
import {AuthModule} from "../auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Order]), AuthModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
