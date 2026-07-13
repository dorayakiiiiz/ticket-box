import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { PaymentFactory } from './payment.factory';
import { Order, OrderStatus, PaymentMethod } from '../entities/order.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';

import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

import { CreatePaymentDto } from './dto/create-payment.dto';

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
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) { }

  /**
   * Tạo URL thanh toán cho đơn hàng
   *
   * Flow:
   * 1. Tìm Order trong DB → phải tồn tại và đang PENDING
   * 2. Lưu paymentMethod vào Order (để webhook biết route sang strategy nào)
   * 3. Gọi strategy tương ứng tạo URL (qua Circuit Breaker)
   *
   * @param dto - Thông tin thanh toán (orderId, paymentMethod, guestName, guestEmail, guestPhone)
   * @param ipAddress - IP client (VNPAY bắt buộc truyền)
   * @returns URL thanh toán để FE redirect trình duyệt
   */
  async createPaymentUrl(
    dto: CreatePaymentDto,
    ipAddress: string,
  ): Promise<string> {
    const { orderId, paymentMethod, guestName, guestEmail, guestPhone } = dto;
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
    order.guestName = guestName;
    order.guestEmail = guestEmail;
    order.guestPhone = guestPhone;
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
    paidAmount?: number,
  ): Promise<{ status: string; message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // BƯỚC 1: TÌM VÀ KHÓA ORDER (TUYỆT ĐỐI KHÔNG DÙNG RELATIONS Ở ĐÂY)
      // Việc này sinh ra câu query sạch: SELECT * FROM orders WHERE orderCode = $1 FOR UPDATE
      const order = await queryRunner.manager.findOne(Order, {
        where: { orderCode: orderCode },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        await queryRunner.rollbackTransaction();
        return { status: 'IGNORED', message: 'Order not found' };
      }

      // BƯỚC 2: KIỂM TRA TRẠNG THÁI
      if (order.status !== OrderStatus.PENDING) {
        await queryRunner.rollbackTransaction();
        this.logger.warn(
          `Webhook ignored: order ${orderCode} already ${order.status}`,
        );
        return { status: 'IGNORED', message: 'Order already processed' };
      }

      // [FIX] Lỗ hổng bảo mật Payment Amount Bypass
      // Bắt buộc kiểm tra số tiền trả về từ Webhook CÓ KHỚP với số tiền thực tế của đơn hàng không.
      // Nếu không kiểm tra, hacker có thể sửa giá trị vnp_Amount thành 100đ và vẫn được báo thanh toán thành công.
      if (paidAmount !== undefined && Number(paidAmount) !== Number(order.totalAmount)) {
        await queryRunner.rollbackTransaction();
        this.logger.error(
          `[SECURITY ALERT] Sai lệch số tiền thanh toán! Đơn ${orderCode} giá ${order.totalAmount} nhưng Webhook báo đã trả ${paidAmount}. Nghi vấn Hacker can thiệp!`,
        );
        return { status: 'IGNORED', message: 'Invalid payment amount' };
      }

      // BƯỚC 2.5: LOAD DATA QUAN HỆ SAU KHI ĐÃ KHÓA THÀNH CÔNG
      // Lúc này Order đã an toàn, ta lấy thêm TicketType và User để xài cho việc tạo vé
      const orderWithRelations = await queryRunner.manager.findOneOrFail(Order, {
        where: { id: order.id },
        relations: { ticketType: { concert: true }, user: true },
      });

      // Gắn data quan hệ ngược lại vào biến order hiện tại
      order.ticketType = orderWithRelations.ticketType;
      order.user = orderWithRelations.user;

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
        ticket.qrCode = uuidv4();
        ticket.status = TicketStatus.VALID;
        tickets.push(ticket);
      }
      await queryRunner.manager.save(tickets);

      // Bước 5: Cập nhật soldQuantity trong TicketType
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

      // Bước 7: Gửi thông báo chứa vé qua Notification Queue
      const emailToSend = order.guestEmail || order.user.email;
      if (emailToSend) {
        // Chỉ gửi DỮ LIỆU THÔ vào queue, việc build template HTML hay text thuộc trách nhiệm của Channel (EmailChannel/SmsChannel)
        // Đây là thiết kế chuẩn SRP (Single Responsibility Principle)
        await this.notificationQueue.add('send-ticket', {
          channel: 'EMAIL',
          recipient: { 
            email: emailToSend, 
            phone: order.guestPhone || order.user.phone, 
            name: order.guestName || order.user.fullName || 'Khách hàng' 
          },
          templateId: 'send-ticket',
          data: {
            orderCode: order.orderCode,
            quantity: order.quantity,
            guestName: order.guestName || order.user.fullName || 'Khách hàng',
            concertName: order.ticketType.concert?.name || 'SỰ KIỆN ÂM NHẠC',
            concertDate: order.ticketType.concert?.date,
            venue: order.ticketType.concert?.venue || 'Đang cập nhật',
            city: order.ticketType.concert?.city || 'Đang cập nhật',
            ticketTypeName: order.ticketType.name,
            ticketPrice: order.ticketType.price,
            tickets: tickets.map(t => ({ id: t.id, qrCode: t.qrCode }))
          },
        }, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
        });
      }

      return { status: 'SUCCESS', message: 'Order paid and tickets created' };

    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(
        { err: error },
        `[ERROR] Failed to process webhook for order ${orderCode} — rolled back`,
      );

      throw error;
    } finally {
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
