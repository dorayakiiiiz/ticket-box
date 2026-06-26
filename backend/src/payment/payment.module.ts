import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentFactory } from './payment.factory';
import { VnPayStrategy } from './strategies/vnpay.strategy';
import { MomoStrategy } from './strategies/momo.strategy';
import { Order } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';

import { NotificationModule } from '../notification/notification.module';

/**
 * PaymentModule — Module thanh toán Phase 4
 *
 * Wiring toàn bộ DI cho luồng thanh toán:
 * - PaymentController: 3 endpoints (create-url, vnpay-ipn, momo-ipn)
 * - PaymentService: business logic tạo URL + xử lý webhook
 * - PaymentFactory: Factory Pattern chọn strategy theo PaymentMethod
 * - VnPayStrategy + MomoStrategy: Strategy Pattern + Circuit Breaker
 *
 * TypeORM entities: Order (update status), Ticket (tạo vé), TicketType (update soldQuantity)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Ticket, TicketType]),
    NotificationModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentFactory,
    VnPayStrategy,
    MomoStrategy,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
