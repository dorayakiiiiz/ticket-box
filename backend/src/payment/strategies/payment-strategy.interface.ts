import { Order } from '../../entities/order.entity';

/**
 * PaymentStrategy — Interface chung cho mọi cổng thanh toán (Strategy Pattern)
 *
 * Mỗi cổng thanh toán (VNPAY, MoMo, ...) phải implement interface này.
 * PaymentFactory sẽ trả về đúng strategy dựa trên PaymentMethod mà user chọn.
 *
 * Lợi ích: Thêm cổng mới (ZaloPay, ShopeePay, ...) chỉ cần tạo class mới
 * implement interface này + đăng ký vào Factory, không sửa code cũ (Open/Closed Principle).
 */
export interface PaymentStrategy {
  /**
   * Tạo URL redirect sang cổng thanh toán
   *
   * @param order - Entity Order đã tồn tại trong DB (status PENDING)
   * @param ipAddress - IP của khách hàng (VNPAY bắt buộc truyền)
   * @returns URL thanh toán để FE redirect trình duyệt sang
   */
  createPaymentUrl(order: Order, ipAddress: string): Promise<string>;

  /**
   * Xác thực chữ ký (signature) từ webhook callback của cổng thanh toán
   *
   * Mục đích: Chống hacker giả danh cổng thanh toán gửi request giả
   * vào API webhook của ta để đánh lừa hệ thống cấp vé miễn phí.
   *
   * @param payload - Dữ liệu thô từ cổng thanh toán gửi về (query params hoặc body)
   * @returns true nếu chữ ký hợp lệ (dữ liệu chưa bị sửa đổi)
   */
  verifyWebhookSignature(payload: any): boolean;
}
