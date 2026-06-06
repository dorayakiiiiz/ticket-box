import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource, LessThan, In } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { Order, OrderStatus } from '../entities/order.entity';

/**
 * CronService — Cronjob dọn dẹp đơn hàng "treo" Phase 4
 *
 * Chạy mỗi 5 phút, thực hiện 2 nhiệm vụ:
 *
 * 1. cancelExpiredOrders(): Tìm Order PENDING quá 15 phút → hủy + nhả vé Redis
 * 2. selfHealRedisRefunds(): Tìm Order CANCELLED nhưng isRefundedToRedis = false
 *    → hoàn vé bị bỏ sót (khi server crash sau khi update DB nhưng trước khi gọi Redis)
 *
 * Kịch bản bảo vệ:
 * - Khách vào VNPAY nhưng tắt máy không thanh toán → PENDING treo → cronjob hủy
 * - Server crash giữa chừng (DB đã CANCELLED, Redis chưa rollback) → self-healing bắt lại
 */
@Injectable()
export class CronService {
  constructor(
    @InjectPinoLogger(CronService.name)
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Cronjob chính — chạy mỗi 5 phút
   *
   * Gộp 2 nhiệm vụ vào 1 cron tick để giảm overhead scheduling
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredOrders(): Promise<void> {
    this.logger.info('⏰ Cronjob: Bắt đầu quét đơn hàng treo...');

    await this.cancelExpiredOrders();
    await this.selfHealRedisRefunds();

    this.logger.info('⏰ Cronjob: Hoàn tất.');
  }

  /**
   * Nhiệm vụ 1: Hủy đơn PENDING quá 15 phút
   *
   * Flow:
   * 1. Query tất cả Order PENDING có createdAt < (now - 15 phút)
   * 2. Với mỗi order:
   *    a. Update status → CANCELLED
   *    b. Gọi Redis rollbackBooking() trả vé
   *    c. Set isRefundedToRedis = true
   * 3. Nếu Redis rollback lỗi → vẫn save CANCELLED nhưng isRefundedToRedis = false
   *    → selfHealRedisRefunds() sẽ bắt lại ở lần chạy kế tiếp
   */
  private async cancelExpiredOrders(): Promise<void> {
    const expirationThreshold = new Date(Date.now() - 15 * 60 * 1000);

    const expiredOrders = await this.dataSource.getRepository(Order).find({
      where: {
        status: OrderStatus.PENDING,
        createdAt: LessThan(expirationThreshold),
      },
      relations: { ticketType: true, user: true },
    });

    if (expiredOrders.length === 0) {
      return;
    }

    this.logger.info(
      `Tìm thấy ${expiredOrders.length} đơn PENDING quá hạn → tiến hành hủy`,
    );

    for (const order of expiredOrders) {
      try {
        // Bước 1: Update DB → CANCELLED
        order.status = OrderStatus.CANCELLED;

        // Bước 2: Gọi Redis rollback trả vé
        await this.redisService.rollbackBooking(
          order.ticketType.id,
          order.user.id,
          order.quantity,
        );

        // Bước 3: Đánh dấu Redis đã được hoàn vé
        order.isRefundedToRedis = true;

        await this.dataSource.getRepository(Order).save(order);

        this.logger.info(
          `✅ Hủy đơn ${order.orderCode}: CANCELLED + Redis rollback OK`,
        );
      } catch (error) {
        // Redis rollback lỗi → vẫn save CANCELLED nhưng isRefundedToRedis = false
        // selfHealRedisRefunds() sẽ thử lại lần sau
        order.status = OrderStatus.CANCELLED;
        order.isRefundedToRedis = false;
        await this.dataSource.getRepository(Order).save(order);

        this.logger.error(
          { err: error },
          `⚠️ Đơn ${order.orderCode}: DB → CANCELLED, nhưng Redis rollback THẤT BẠI. Sẽ thử lại lần sau.`,
        );
      }
    }
  }

  /**
   * Nhiệm vụ 2: Self-healing — hoàn vé Redis bị bỏ sót
   *
   * Tìm Order đã CANCELLED (hoặc FAILED) nhưng isRefundedToRedis = false
   * → thử gọi Redis rollback lại
   *
   * Kịch bản kích hoạt:
   * - cancelExpiredOrders() ở trên update DB xong nhưng Redis lỗi
   * - Server crash giữa chừng (DB commit rồi, Redis chưa gọi)
   * - processWebhookFailure() đánh FAILED nhưng chưa rollback Redis
   */
  private async selfHealRedisRefunds(): Promise<void> {
    const unrefundedOrders = await this.dataSource.getRepository(Order).find({
      where: {
        status: In([OrderStatus.CANCELLED, OrderStatus.FAILED]),
        isRefundedToRedis: false,
      },
      relations: { ticketType: true, user: true },
    });

    if (unrefundedOrders.length === 0) {
      return;
    }

    this.logger.warn(
      `🔧 Self-healing: Tìm thấy ${unrefundedOrders.length} đơn chưa hoàn vé Redis`,
    );

    for (const order of unrefundedOrders) {
      try {
        await this.redisService.rollbackBooking(
          order.ticketType.id,
          order.user.id,
          order.quantity,
        );

        order.isRefundedToRedis = true;
        await this.dataSource.getRepository(Order).save(order);

        this.logger.info(
          `🔧 Self-heal OK: Đơn ${order.orderCode} đã hoàn vé Redis`,
        );
      } catch (error) {
        this.logger.error(
          { err: error },
          `🔧 Self-heal FAILED: Đơn ${order.orderCode} vẫn chưa hoàn được Redis. Sẽ thử lại.`,
        );
      }
    }
  }
}
