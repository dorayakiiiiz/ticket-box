import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { PaymentFactory } from './payment.factory';
import { Order, OrderStatus, PaymentMethod } from '../entities/order.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';

/**
 * PaymentService — Trung tâm xử lý thanh toán Phase 4
 *
 * 2 nhiệm vụ chính:
 * 1. createPaymentUrl(): Tạo link thanh toán cho FE redirect
 * 2. processWebhookSuccess(): Xử lý webhook callback khi thanh toán thành công
 *    - Dùng TypeORM Transaction + Pessimistic Write Lock
 *    - Đảm bảo Order → PAID + Tạo N Ticket xảy ra nguyên tử (cùng sống/cùng chết)
 */
@Injectable()
export class PaymentService {
  constructor(
    @InjectPinoLogger(PaymentService.name)
    private readonly logger: PinoLogger,
    private readonly paymentFactory: PaymentFactory,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tạo URL thanh toán cho đơn hàng
   *
   * Flow:
   * 1. Tìm Order trong DB → phải tồn tại và đang PENDING
   * 2. Lưu paymentMethod vào Order (để webhook biết route sang strategy nào)
   * 3. Gọi strategy tương ứng tạo URL (qua Circuit Breaker)
   *
   * @param orderId - UUID đơn hàng từ Phase 3
   * @param paymentMethod - Cổng thanh toán user chọn (VNPAY/MOMO)
   * @param ipAddress - IP client (VNPAY bắt buộc truyền)
   * @returns URL thanh toán để FE redirect trình duyệt
   */
  async createPaymentUrl(
    orderId: string,
    paymentMethod: PaymentMethod,
    ipAddress: string,
  ): Promise<string> {
    // 1. Tìm Order — phải tồn tại và đang PENDING
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id: orderId },
      relations: { ticketType: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderId}`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Đơn hàng ${orderId} không ở trạng thái chờ thanh toán (hiện tại: ${order.status})`,
      );
    }

    // 2. Lưu phương thức thanh toán đã chọn vào Order
    order.paymentMethod = paymentMethod;
    await this.dataSource.getRepository(Order).save(order);

    // 3. Lấy strategy tương ứng và tạo URL (Circuit Breaker bọc bên trong)
    const strategy = this.paymentFactory.getStrategy(paymentMethod);
    const paymentUrl = await strategy.createPaymentUrl(order, ipAddress);

    this.logger.info(
      `Payment URL created: order=${orderId}, method=${paymentMethod}`,
    );

    return paymentUrl;
  }

  /**
   * Xử lý webhook thanh toán thành công — TRÁ I TIM CỦA PHASE 4
   *
   * Đây là hàm nhạy cảm nhất trong toàn bộ hệ thống vì liên quan đến TIỀN.
   * Sử dụng TypeORM Transaction + Pessimistic Write Lock để đảm bảo:
   * - Không có 2 webhook callback xử lý cùng 1 order đồng thời (race condition)
   * - Order → PAID và Ticket creation phải xảy ra nguyên tử (cùng sống/cùng chết)
   *
   * Flow:
   * 1. Mở transaction Postgres
   * 2. Khóa dòng Order (pessimistic_write) → tránh 2 webhook đua nhau
   * 3. Kiểm tra Order phải PENDING (chưa xử lý)
   * 4. Update Order → PAID
   * 5. Tạo N bản ghi Ticket (QR code = UUID v4)
   * 6. Cập nhật soldQuantity trong TicketType
   * 7. Commit transaction
   *
   * Nếu BẤT KỲ bước nào lỗi → Rollback TOÀN BỘ → dữ liệu an toàn
   *
   * @param orderId - UUID đơn hàng (từ vnp_TxnRef hoặc MoMo orderId)
   * @param transactionId - Mã giao dịch của cổng thanh toán (để truy vết/đối soát)
   * @returns Kết quả xử lý: SUCCESS, IGNORED (đã xử lý rồi), hoặc throw Error
   */
  async processWebhookSuccess(
    orderCode: string,
    transactionId?: string,
  ): Promise<{ status: string; message: string }> {
    // Mở QueryRunner — luồng kết nối DB độc lập cho transaction này
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //  Từ đây PHẢI dùng queryRunner.manager cho mọi thao tác DB
      // Dùng this.orderRepo sẽ NẰMM NGOÀI transaction → mất tính nguyên tử

      // Bước 1: Khóa dòng Order bằng Pessimistic Write Lock
      // Nếu 2 webhook callback đến cùng lúc, cái thứ 2 sẽ phải CHỜ cái thứ nhất xong
      const order = await queryRunner.manager.findOne(Order, {
        where: { orderCode: orderCode },
        relations: { ticketType: true, user: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        await queryRunner.rollbackTransaction();
        return { status: 'IGNORED', message: 'Order not found' };
      }

      // Bước 2: Kiểm tra trạng thái — chỉ xử lý nếu PENDING
      // Nếu đã PAID/CANCELLED → webhook trùng lặp hoặc đến muộn → bỏ qua
      if (order.status !== OrderStatus.PENDING) {
        await queryRunner.rollbackTransaction();
        this.logger.warn(
          `Webhook ignored: order ${orderCode} already ${order.status}`,
        );
        return { status: 'IGNORED', message: 'Order already processed' };
      }

      // Bước 3: Update Order → PAID + lưu mã giao dịch cổng thanh toán
      order.status = OrderStatus.PAID;
      if (transactionId) {
        order.paymentId = transactionId;
      }
      await queryRunner.manager.save(order);

      // Bước 4: Tạo N bản ghi Ticket — mỗi ticket có QR code unique
      const tickets: Ticket[] = [];
      for (let i = 0; i < order.quantity; i++) {
        const ticket = new Ticket();
        ticket.order = order;
        ticket.ticketType = order.ticketType;
        ticket.user = order.user;
        ticket.qrCode = uuidv4(); // Mã QR duy nhất — dùng cho check-in Phase 5
        ticket.status = TicketStatus.VALID;
        tickets.push(ticket);
      }
      await queryRunner.manager.save(tickets);

      // Bước 5: Cập nhật soldQuantity trong TicketType (đồng bộ Postgres với Redis)
      await queryRunner.manager.increment(
        TicketType,
        { id: order.ticketType.id },
        'soldQuantity',
        order.quantity,
      );

      // Bước 6: Commit transaction — ghi vĩnh viễn xuống DB
      await queryRunner.commitTransaction();

      this.logger.info(
        `[SUCCESS] Order ${orderCode} → PAID. Created ${order.quantity} ticket(s). Transaction: ${transactionId || 'N/A'}`,
      );

      return { status: 'SUCCESS', message: 'Order paid and tickets created' };

    } catch (error) {
      // Lỗi BẤT KỲ → Rollback toàn bộ thao tác từ bước 1
      // Postgres quay về trạng thái trước khi mở transaction → dữ liệu an toàn
      await queryRunner.rollbackTransaction();

      this.logger.error(
        { err: error },
        `[ERROR] Failed to process webhook for order ${orderCode} — rolled back`,
      );

      throw error; // Re-throw để Controller trả mã lỗi cho cổng thanh toán biết cần gọi lại

    } finally {
      // BẮT BUỘC giải phóng connection trả lại Pool
      // Nếu không release → connection leak → cạn kiệt Pool → sập hệ thống
      await queryRunner.release();
    }
  }

  /**
   * Xử lý webhook thanh toán thất bại
   *
   * Khi khách hàng hủy thanh toán hoặc giao dịch lỗi trên cổng,
   * chỉ cập nhật trạng thái Order → FAILED (không động đến vé/Redis)
   * Cronjob sẽ lo việc dọn dẹp và nhả vé nếu cần
   *
   * @param orderCode - Mã đơn hàng
   */
  async processWebhookFailure(orderCode: string): Promise<void> {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { orderCode },
    });

    if (!order || order.status !== OrderStatus.PENDING) {
      return; // Đã xử lý rồi hoặc không tồn tại
    }

    order.status = OrderStatus.FAILED;
    await this.dataSource.getRepository(Order).save(order);

    this.logger.warn(
      `Order ${orderCode} marked as FAILED due to payment failure`,
    );
  }
}
