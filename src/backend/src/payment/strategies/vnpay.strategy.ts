import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as crypto from 'crypto';
import CircuitBreaker from 'opossum';
import { PaymentStrategy } from './payment-strategy.interface';
import { Order } from '../../entities/order.entity';

/**
 * VnPayStrategy — Cổng thanh toán VNPAY (Sandbox)
 *
 * Implement PaymentStrategy theo đúng tài liệu VNPAY:
 * - Tạo URL thanh toán: sắp xếp params theo alphabet → HMAC-SHA512 → redirect
 * - Xác thực Webhook (IPN): tái tạo hash từ query params và so sánh vnp_SecureHash
 *
 * Circuit Breaker (Opossum) bảo vệ hàm tạo URL:
 * - Timeout 5s: nếu VNPAY không phản hồi sau 5s → coi như lỗi
 * - Error threshold 50%: nếu 50% request lỗi → ngắt mạch (OPEN)
 * - Reset timeout 30s: sau 30s thử lại (HALF-OPEN)
 */
@Injectable()
export class VnPayStrategy implements PaymentStrategy {
  private breaker: CircuitBreaker;

  constructor(
    @InjectPinoLogger(VnPayStrategy.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    // Khởi tạo Circuit Breaker bọc hàm tạo URL thanh toán
    const options: CircuitBreaker.Options = {
      timeout: 5000,                 // Quá 5s không phản hồi → báo lỗi
      errorThresholdPercentage: 50,  // 50% request lỗi → ngắt mạch
      resetTimeout: 30000,           // 30s sau mạch chuyển HALF-OPEN thử lại
    };

    this.breaker = new CircuitBreaker(
      this.generatePaymentUrl.bind(this),
      options,
    );

    // Fallback: khi mạch OPEN, trả lỗi 503 ngay lập tức thay vì chờ timeout
    this.breaker.fallback(() => {
      throw new ServiceUnavailableException(
        'Cổng thanh toán VNPAY hiện đang quá tải hoặc bảo trì. Vui lòng thử lại sau!',
      );
    });

    // Log trạng thái Circuit Breaker để monitoring
    this.breaker.on('open', () =>
      this.logger.warn('VNPAY Circuit Breaker: OPEN — ngắt mạch do lỗi liên tục'),
    );
    this.breaker.on('halfOpen', () =>
      this.logger.info('VNPAY Circuit Breaker: HALF-OPEN — đang thử kết nối lại'),
    );
    this.breaker.on('close', () =>
      this.logger.info('VNPAY Circuit Breaker: CLOSED — hoạt động bình thường'),
    );
  }

  /**
   * Tạo URL thanh toán VNPAY — được gọi qua Circuit Breaker
   *
   * @param order - Entity Order (cần id và totalAmount)
   * @param ipAddress - IP client (VNPAY bắt buộc)
   * @returns URL redirect sang trang thanh toán VNPAY
   */
  async createPaymentUrl(order: Order, ipAddress: string): Promise<string> {
    // Circuit Breaker.fire() sẽ quản lý timeout, error counting và fallback
    return this.breaker.fire(order, ipAddress) as Promise<string>;
  }

  /**
   * Hàm cốt lõi tạo URL — chạy bên trong Circuit Breaker
   *
   * Tuân thủ quy trình VNPAY Sandbox:
   * 1. Ghép các tham số bắt buộc (TmnCode, Amount*100, TxnRef, ...)
   * 2. Sắp xếp theo bảng chữ cái alphabet (luật VNPAY)
   * 3. Tạo query string → hash HMAC-SHA512 với HashSecret
   * 4. Gắn vnp_SecureHash vào cuối URL
   */
  private async generatePaymentUrl(order: Order, ipAddress: string): Promise<string> {
    const tmnCode = this.configService.get<string>('VNPay_TMN_CODE') || '';
    const hashSecret = this.configService.get<string>('VNPay_HASH_SECRET') || '';
    const vnpUrl = this.configService.get<string>('VNPay_URL') || '';
    const returnUrl = this.configService.get<string>('VNPay_RETURN_URL') || '';

    // Định dạng thời gian theo chuẩn VNPAY: yyyyMMddHHmmss
    const now = new Date();
    const createDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    // Ghép tham số theo chuẩn VNPAY v2.1.0
    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: order.orderCode,              // Mã đơn hàng unique để VNPAY đối soát
      vnp_OrderInfo: `Thanh toan don hang ${order.orderCode}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(order.totalAmount * 100), // VNPAY tính theo xu (VND * 100)
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddress,
      vnp_CreateDate: createDate,
    };

    // Sắp xếp key theo alphabet (bắt buộc theo luật VNPAY)
    const sortedParams = this.sortObject(vnpParams);

    // Tạo query string từ params đã sắp xếp (các properties ĐÃ được encode trong sortObject)
    const queryString = Object.keys(sortedParams)
      .map((key) => `${key}=${sortedParams[key]}`)
      .join('&');

    // Tạo chữ ký HMAC-SHA512 với HashSecret
    const hmac = crypto.createHmac('sha512', hashSecret);
    const signed = hmac.update(Buffer.from(queryString, 'utf-8')).digest('hex');

    const paymentUrl = `${vnpUrl}?${queryString}&vnp_SecureHash=${signed}`;

    this.logger.info(
      `VNPAY payment URL created for order ${order.orderCode}`,
    );

    return paymentUrl;
  }

  /**
   * Xác thực chữ ký Webhook (IPN) từ VNPAY
   *
   * VNPAY gửi callback kèm vnp_SecureHash. Ta phải:
   * 1. Loại bỏ vnp_SecureHash và vnp_SecureHashType khỏi params
   * 2. Sắp xếp params còn lại theo alphabet
   * 3. Tạo lại hash HMAC-SHA512 từ params + HashSecret
   * 4. So sánh hash tạo ra với vnp_SecureHash nhận được
   *
   * @param payload - Query params nguyên bản VNPAY gửi về
   * @returns true nếu chữ ký khớp, false nếu bị giả mạo
   */
  verifyWebhookSignature(payload: Record<string, string>): boolean {
    const vnpSecureHash = payload['vnp_SecureHash'];
    const hashSecret = this.configService.get<string>('VNPay_HASH_SECRET') || '';

    // Tạo bản sao loại bỏ trường hash để tính toán lại
    const params = { ...payload };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    // Sắp xếp lại y hệt lúc tạo URL (tự động encode key và value)
    const sortedParams = this.sortObject(params);
    const signData = Object.keys(sortedParams)
      .map((key) => `${key}=${sortedParams[key]}`)
      .join('&');

    // Hash lại và so sánh
    const hmac = crypto.createHmac('sha512', hashSecret);
    const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return vnpSecureHash === checkHash;
  }

  private sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    const str: string[] = [];
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    
    for (const key of str) {
      // Decode để lấy lại key gốc truy cập object, sau đó mã hóa value và đổi %20 thành +
      const rawKey = decodeURIComponent(key);
      sorted[key] = encodeURIComponent(String(obj[rawKey])).replace(/%20/g, '+');
    }
    return sorted;
  }
}
