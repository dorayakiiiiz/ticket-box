import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PaymentStrategy } from './strategies/payment-strategy.interface';
import { VnPayStrategy } from './strategies/vnpay.strategy';
import { MomoStrategy } from './strategies/momo.strategy';
import { PaymentMethod } from '../entities/order.entity';

/**
 * PaymentFactory — Factory Pattern bọc Strategy
 *
 * Nhận vào PaymentMethod (VNPAY/MOMO) từ client gửi lên,
 * trả về đúng PaymentStrategy tương ứng.
 *
 * Lợi ích: Controller và Service chỉ gọi factory.getStrategy(method),
 * không cần biết bên trong xử lý cổng nào. Thêm cổng mới chỉ cần:
 * 1. Tạo class mới implement PaymentStrategy
 * 2. Inject vào constructor Factory
 * 3. Thêm case vào switch
 */
@Injectable()
export class PaymentFactory {
  constructor(
    @InjectPinoLogger(PaymentFactory.name)
    private readonly logger: PinoLogger,
    private readonly vnPayStrategy: VnPayStrategy,
    private readonly momoStrategy: MomoStrategy,
  ) {}

  /**
   * Trả về Strategy tương ứng với phương thức thanh toán
   *
   * @param method - PaymentMethod enum (VNPAY hoặc MOMO)
   * @returns PaymentStrategy instance tương ứng
   * @throws Error nếu method không hợp lệ
   */
  getStrategy(method: PaymentMethod): PaymentStrategy {
    switch (method) {
      case PaymentMethod.VNPAY:
        this.logger.info('Selected payment strategy: VNPAY');
        return this.vnPayStrategy;
      case PaymentMethod.MOMO:
        this.logger.info('Selected payment strategy: MoMo');
        return this.momoStrategy;
      default:
        throw new Error(`Phương thức thanh toán không hợp lệ: ${method}`);
    }
  }
}
