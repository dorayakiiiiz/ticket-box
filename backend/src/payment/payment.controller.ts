import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PaymentService } from './payment.service';
import { PaymentFactory } from './payment.factory';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentMethod } from '../entities/order.entity';
import { Public } from '../common/guards/jwt.strategy';

/**
 * PaymentController — API endpoints cho luồng thanh toán Phase 4
 *
 * 3 endpoints:
 * 1. POST /payment/create-url  (Auth required) — Client gọi lấy URL thanh toán
 * 2. GET  /payment/vnpay-ipn   (Public)        — VNPAY gọi IPN callback
 * 3. POST /payment/momo-ipn    (Public)        — MoMo gọi IPN callback
 *
 * Lưu ý: Webhook endpoints (vnpay-ipn, momo-ipn) PHẢI là @Public()
 * vì cổng thanh toán gọi server-to-server, không có JWT token
 */
@Controller('payment')
export class PaymentController {
  constructor(
    @InjectPinoLogger(PaymentController.name)
    private readonly logger: PinoLogger,
    private readonly paymentService: PaymentService,
    private readonly paymentFactory: PaymentFactory,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. POST /payment/create-url — Tạo URL thanh toán
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Tạo URL thanh toán cho đơn hàng
   *
   * FE gọi endpoint này sau khi user chọn phương thức thanh toán tại trang Checkout.
   * Backend sẽ gọi cổng thanh toán tương ứng (qua Circuit Breaker) tạo URL.
   * FE nhận URL và redirect trình duyệt sang cổng: window.location.href = paymentUrl
   *
   * @param dto - { orderId: string, paymentMethod: 'VNPAY' | 'MOMO' }
   * @param req - Request object (lấy IP address cho VNPAY)
   * @returns { paymentUrl: string }
   */
  @Post('create-url')
  @HttpCode(HttpStatus.OK)
  async createPaymentUrl(
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ) {
    // Lấy IP từ header X-Forwarded-For (qua proxy/CDN) hoặc từ socket trực tiếp
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const paymentUrl = await this.paymentService.createPaymentUrl(
      dto.orderId,
      dto.paymentMethod,
      ipAddress,
    );

    return { paymentUrl };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. GET /payment/vnpay-ipn — VNPAY Webhook (IPN = Instant Payment Notification)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Xử lý IPN callback từ VNPAY
   *
   * VNPAY gọi endpoint này server-to-server sau khi khách hoàn tất thanh toán.
   * Phương thức GET với dữ liệu truyền qua query params.
   *
   * Flow:
   * 1. Kiểm tra chữ ký (vnp_SecureHash) → chống giả mạo
   * 2. Nếu vnp_ResponseCode === '00' (thành công) → processWebhookSuccess
   * 3. Nếu khác '00' → processWebhookFailure
   * 4. Trả response JSON theo format VNPAY yêu cầu { RspCode, Message }
   *
   * VNPAY sẽ retry gửi IPN nếu không nhận được response hợp lệ,
   * nên nếu server lỗi, ta throw error để VNPAY biết cần gọi lại
   *
   * @param query - Query params VNPAY gửi kèm (vnp_TxnRef, vnp_ResponseCode, vnp_SecureHash, ...)
   * @param res - Response object (cần dùng @Res() vì VNPAY yêu cầu format response cụ thể)
   */
  @Public()
  @Get('vnpay-ipn')
  async vnpayWebhook(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    this.logger.info('--- Nhận IPN callback từ VNPAY ---');

    try {
      // Bước 1: Xác thực chữ ký — chống giả mạo
      const vnpayStrategy = this.paymentFactory.getStrategy(PaymentMethod.VNPAY);
      const isValidSignature = vnpayStrategy.verifyWebhookSignature(query);

      if (!isValidSignature) {
        this.logger.error('VNPAY IPN: Chữ ký KHÔNG hợp lệ! Nghi vấn request giả mạo.');
        return res.status(HttpStatus.OK).json({
          RspCode: '97',
          Message: 'Invalid Checksum',
        });
      }

      const orderCode = query['vnp_TxnRef'];         // Mã đơn hàng ta gửi lúc tạo URL
      const responseCode = query['vnp_ResponseCode']; // Mã phản hồi VNPAY (00 = thành công), VNPay sẽ tự thực hiện
      const transactionNo = query['vnp_TransactionNo']; // Mã giao dịch phía VNPAY
      const vnpAmount = query['vnp_Amount'];

      this.logger.info(
        `VNPAY IPN: orderCode=${orderCode}, responseCode=${responseCode}, transNo=${transactionNo}, vnpAmount=${vnpAmount}`,
      );

      // Bước 2: Kiểm tra mã phản hồi — 00 là thành công
      if (responseCode === '00') {
        const result = await this.paymentService.processWebhookSuccess(
          orderCode,
          transactionNo,
          vnpAmount ? Number(vnpAmount) / 100 : undefined,
        );

        return res.status(HttpStatus.OK).json({
          RspCode: '00',
          Message: result.status === 'SUCCESS' ? 'Confirm Success' : result.message,
        });
      } else {
        // Thanh toán thất bại (user hủy, hết tiền, lỗi OTP, ...)
        await this.paymentService.processWebhookFailure(orderCode);

        return res.status(HttpStatus.OK).json({
          RspCode: '00',
          Message: 'Payment failed acknowledged',
        });
      }

    } catch (error) {
      this.logger.error(
        { err: error },
        'VNPAY IPN: Lỗi hệ thống khi xử lý webhook',
      );
      // Trả mã 99 để VNPAY biết cần gọi lại (retry)
      return res.status(HttpStatus.OK).json({
        RspCode: '99',
        Message: 'Unknown Error',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. POST /payment/momo-ipn — MoMo Webhook (IPN)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Xử lý IPN callback từ MoMo
   *
   * MoMo gọi endpoint này server-to-server qua POST với body JSON.
   * Khác VNPAY ở chỗ: dùng POST + body thay vì GET + query params.
   *
   * Flow:
   * 1. Kiểm tra signature → chống giả mạo
   * 2. Nếu resultCode === 0 (thành công) → processWebhookSuccess
   * 3. Nếu khác 0 → processWebhookFailure
   * 4. Trả HTTP 204 No Content (theo tài liệu MoMo)
   *
   * @param body - JSON body MoMo gửi về (orderId, resultCode, signature, transId, ...)
   * @param res - Response object
   */
  @Public()
  @Post('momo-ipn')
  async momoWebhook(
    @Body() body: Record<string, any>,
    @Res() res: Response,
  ) {
    this.logger.info('--- Nhận IPN callback từ MoMo ---');

    try {
      // Bước 1: Xác thực chữ ký
      const momoStrategy = this.paymentFactory.getStrategy(PaymentMethod.MOMO);
      const isValidSignature = momoStrategy.verifyWebhookSignature(body);

      if (!isValidSignature) {
        this.logger.error('MoMo IPN: Chữ ký KHÔNG hợp lệ! Nghi vấn request giả mạo.');
        return res.status(HttpStatus.BAD_REQUEST).send('Invalid Signature');
      }

      const { orderId, resultCode, transId, message, amount } = body;

      this.logger.info(
        `MoMo IPN: orderId=${orderId}, resultCode=${resultCode}, transId=${transId}, amount=${amount}`,
      );

      // Bước 2: resultCode === 0 là thanh toán thành công (MoMo dùng number, không phải string)
      if (resultCode === 0) {
        await this.paymentService.processWebhookSuccess(
          orderId,
          String(transId),
          amount ? Number(amount) : undefined,
        );
      } else {
        this.logger.warn(
          `MoMo IPN: Giao dịch thất bại. resultCode=${resultCode}, message=${message}`,
        );
        await this.paymentService.processWebhookFailure(orderId);
      }

      // Trả HTTP 204 theo tài liệu MoMo Sandbox — báo đã xử lý xong
      return res.status(HttpStatus.NO_CONTENT).send();

    } catch (error) {
      this.logger.error(
        { err: error },
        'MoMo IPN: Lỗi hệ thống khi xử lý webhook',
      );
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
    }
  }
}
