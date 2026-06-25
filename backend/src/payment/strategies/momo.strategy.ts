import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as crypto from 'crypto';
import * as https from 'https';
import CircuitBreaker from 'opossum';
import { PaymentStrategy } from './payment-strategy.interface';
import { Order } from '../../entities/order.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * MomoStrategy — Cổng thanh toán MoMo (Sandbox)
 *
 * Implement PaymentStrategy theo tài liệu MoMo:
 * - Tạo URL thanh toán: ghép rawSignature → HMAC-SHA256 → POST sang MoMo API → lấy payUrl
 * - Xác thực Webhook (IPN): tái tạo rawSignature từ body → hash → so sánh signature
 *
 * Khác biệt chính so với VNPAY:
 * - MoMo dùng HTTP POST (không phải redirect URL với query params)
 * - MoMo dùng HMAC-SHA256 (VNPAY dùng SHA512)
 * - MoMo trả về payUrl trong response JSON (VNPAY trả URL trực tiếp từ params)
 *
 * Circuit Breaker (Opossum) bảo vệ hàm gọi MoMo API:
 * - Timeout 5s, Error threshold 50%, Reset timeout 30s
 */
@Injectable()
export class MomoStrategy implements PaymentStrategy {
  private breaker: CircuitBreaker;

  constructor(
    @InjectPinoLogger(MomoStrategy.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    const options: CircuitBreaker.Options = {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    };

    this.breaker = new CircuitBreaker(
      this.generatePaymentUrl.bind(this),
      options,
    );

    this.breaker.fallback(() => {
      throw new ServiceUnavailableException(
        'Cổng thanh toán MoMo hiện đang quá tải hoặc bảo trì. Vui lòng thử lại sau!',
      );
    });

    this.breaker.on('open', () =>
      this.logger.warn('MoMo Circuit Breaker: OPEN — ngắt mạch do lỗi liên tục'),
    );
    this.breaker.on('halfOpen', () =>
      this.logger.info('MoMo Circuit Breaker: HALF-OPEN — đang thử kết nối lại'),
    );
    this.breaker.on('close', () =>
      this.logger.info('MoMo Circuit Breaker: CLOSED — hoạt động bình thường'),
    );
  }

  /**
   * Tạo URL thanh toán MoMo — được gọi qua Circuit Breaker
   */
  async createPaymentUrl(order: Order, ipAddress: string): Promise<string> {
    return this.breaker.fire(order, ipAddress) as Promise<string>;
  }

  /**
   * Hàm cốt lõi tạo URL — chạy bên trong Circuit Breaker
   *
   * Tuân thủ quy trình MoMo Sandbox:
   * 1. Ghép rawSignature theo thứ tự bắt buộc (accessKey, amount, ...)
   * 2. Hash HMAC-SHA256 với secretKey
   * 3. POST request sang MoMo API chứa payload + signature
   * 4. MoMo trả về JSON chứa payUrl → redirect user sang đó
   */
  private async generatePaymentUrl(order: Order, _ipAddress: string): Promise<string> {
    const partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE') || '';
    const accessKey = this.configService.get<string>('MOMO_ACCESS_KEY') || '';
    const secretKey = this.configService.get<string>('MOMO_SECRET_KEY') || '';
    const momoApiUrl = this.configService.get<string>('MOMO_API_URL') || '';
    const returnUrl = this.configService.get<string>('VNPay_RETURN_URL') || ''; // Dùng chung return URL

    const requestId = uuidv4();
    const orderId = order.orderCode;
    const amount = Math.round(Number(order.totalAmount));
    const orderInfo = `Thanh toan don hang ${order.orderCode}`;
    const redirectUrl = returnUrl;
    const ipnUrl = `${this.configService.get<string>('BACKEND_URL', 'http://localhost:3001')}/payment/momo-ipn`;
    const extraData = '';
    const requestType = 'captureWallet';

    // Ghép rawSignature theo đúng thứ tự MoMo yêu cầu (PHẢI CHÍNH XÁC 100%)
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    // Hash HMAC-SHA256 với secretKey (MoMo dùng SHA256, VNPAY dùng SHA512)
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = JSON.stringify({
      partnerCode,
      partnerName: 'TicketBox',
      storeId: 'TicketBoxStore',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      requestType,
      extraData,
      signature,
    });

    // Gọi HTTP POST sang MoMo API bằng native https (không cần thêm dependency)
    const momoResponse = await this.postToMomo(momoApiUrl, requestBody);

    if (momoResponse.resultCode !== 0) {
      this.logger.error(
        `MoMo API Error: resultCode=${momoResponse.resultCode}, message=${momoResponse.message}`,
      );
      throw new Error(`MoMo payment creation failed: ${momoResponse.message}`);
    }

    this.logger.info(
      `MoMo payment URL created for order ${order.orderCode}`,
    );

    return momoResponse.payUrl;
  }

  /**
   * Gửi HTTP POST request sang MoMo API
   * Dùng native https module để tránh thêm dependency (axios/got)
   *
   * @param apiUrl - URL API MoMo (sandbox hoặc production)
   * @param body - JSON string chứa payload đã ký
   * @returns Response JSON từ MoMo
   */
  private postToMomo(apiUrl: string, body: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(apiUrl);
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Invalid JSON response from MoMo'));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(body);
      req.end();
    });
  }

  /**
   * Xác thực chữ ký Webhook (IPN) từ MoMo
   *
   * MoMo gửi POST body kèm signature. Ta phải:
   * 1. Ghép rawSignature từ các trường trong body theo thứ tự bắt buộc
   * 2. Hash HMAC-SHA256 với secretKey
   * 3. So sánh hash với signature nhận được
   *
   * LUẬT MOMO: Thứ tự các trường khi ghép chuỗi PHẢI CHÍNH XÁC 100%.
   * Thiếu 1 trường hoặc đổi chỗ 2 trường → lệch hash ngay lập tức.
   *
   * @param payload - Body JSON từ MoMo gửi về
   * @returns true nếu chữ ký hợp lệ
   */
  verifyWebhookSignature(payload: Record<string, any>): boolean {
    const secretKey = this.configService.get<string>('MOMO_SECRET_KEY') || '';
    const accessKey = this.configService.get<string>('MOMO_ACCESS_KEY') || '';

    const {
      signature,
      amount,
      extraData,
      message,
      orderId,
      partnerCode,
      requestId,
      responseTime,
      resultCode,
      transId,
    } = payload;

    // Ghép rawSignature theo đúng thứ tự MoMo quy định cho IPN callback
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&partnerCode=${partnerCode}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const checkSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    return signature === checkSignature;
  }
}
