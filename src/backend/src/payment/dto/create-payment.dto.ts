import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { PaymentMethod } from '../../entities/order.entity';

/**
 * DTO cho POST /payment/create-url
 *
 * Client gửi lên orderId (UUID từ Phase 3) và paymentMethod (VNPAY/MOMO)
 * để backend tạo link thanh toán tương ứng và redirect user sang cổng
 */
export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'orderId không được để trống' })
  orderId: string;

  @IsEnum(PaymentMethod, {
    message: 'paymentMethod phải là VNPAY hoặc MOMO',
  })
  @IsNotEmpty({ message: 'paymentMethod không được để trống' })
  paymentMethod: PaymentMethod;

  @IsString()
  @IsNotEmpty({ message: 'Tên người nhận vé không được để trống' })
  guestName: string;

  @IsString()
  @IsNotEmpty({ message: 'Email người nhận vé không được để trống' })
  guestEmail: string;

  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại người nhận vé không được để trống' })
  guestPhone: string;
}
