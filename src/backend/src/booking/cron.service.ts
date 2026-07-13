import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource, LessThan, In } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { Concert, ConcertStatus } from '../entities/concert.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

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
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) {}

  /**
   * Cronjob chính — chạy mỗi 5 phút
   *
   * Gộp 2 nhiệm vụ vào 1 cron tick để giảm overhead scheduling
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredOrders(): Promise<void> {
    // [FIX] Lỗ hổng Distributed Cronjob Race Condition
    // Sử dụng Redis SET NX để tạo Distributed Lock.
    // Đảm bảo chỉ có 1 server (instance) duy nhất được phép chạy cronjob này tại 1 thời điểm,
    // tránh việc nhiều server cùng query và trả vé lặp lại (double refund) trên Redis.
    const lockKey = 'cronjob:lock:handleExpiredOrders';
    const lockTTL = 4 * 60; // Khóa trong 4 phút (cron chạy 5 phút/lần)
    
    const acquired = await this.redisService.acquireLock(lockKey, lockTTL);
    if (!acquired) {
      this.logger.info('⏰ Cronjob: Server khác đang chạy quét đơn hàng. Bỏ qua để tránh Race Condition.');
      return;
    }

    this.logger.info('⏰ Cronjob: Bắt đầu quét đơn hàng treo (Đã giữ Lock)...');

    await this.cancelExpiredOrders();
    await this.selfHealRedisRefunds();

    this.logger.info('⏰ Cronjob: Hoàn tất.');
    // Không cần nhả lock (delete key) vì TTL 4 phút sẽ tự động nhả trước chu kỳ 5 phút tiếp theo,
    // đồng thời ngăn các node khác chạy lặp lại nếu đồng hồ máy chủ bị lệch vài giây.
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

  /**
   * Nhiệm vụ 3: Nhắc nhở sự kiện trước 24 giờ
   * 
   * Chạy mỗi 30 phút. Tìm các concert sắp diễn ra (<= 24h) và chưa nhắc nhở
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleEventReminders(): Promise<void> {
    const lockKey = 'cronjob:lock:sendEventReminders';
    const lockTTL = 20 * 60; // Khóa trong 20 phút

    const acquired = await this.redisService.acquireLock(lockKey, lockTTL);
    if (!acquired) {
      this.logger.info('⏰ Cronjob Reminder: Server khác đang chạy. Bỏ qua.');
      return;
    }

    this.logger.info('⏰ Cronjob Reminder: Bắt đầu quét các Concert sắp diễn ra...');

    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const concerts = await this.dataSource.getRepository(Concert).find({
        where: {
          status: ConcertStatus.UPCOMING,
          isReminded: false,
          date: LessThan(in24Hours),
        },
      });

      if (concerts.length === 0) {
        this.logger.info('⏰ Cronjob Reminder: Không có concert nào cần nhắc nhở lúc này.');
        return;
      }

      for (const concert of concerts) {
        // Chỉ nhắc những concert có giờ diễn ra lớn hơn hiện tại
        if (concert.date <= now) continue;

        this.logger.info(`⏰ Tiến hành gửi nhắc nhở cho concert ${concert.name} (ID: ${concert.id})...`);

        // Tìm tất cả vé đã thanh toán
        const orders = await this.dataSource.getRepository(Order).find({
          where: {
            concert: { id: concert.id },
            status: OrderStatus.PAID,
          },
          relations: { user: true },
        });

        let sentCount = 0;
        for (const order of orders) {
          const email = order.guestEmail || order.user?.email;
          const name = order.guestName || order.user?.fullName || 'Khán giả';

          if (!email) continue;

          await this.notificationQueue.add('send-reminder', {
            channel: 'EMAIL',
            recipient: { 
              email: email, 
              phone: order.guestPhone || order.user?.phone, 
              name: name 
            },
            templateId: 'send-reminder',
            data: {
              guestName: name,
              concertName: concert.name,
              eventDate: concert.date.toLocaleString('vi-VN'),
              venue: concert.venue,
              city: concert.city
            },
          });

          sentCount++;
        }

        concert.isReminded = true;
        await this.dataSource.getRepository(Concert).save(concert);
        this.logger.info(`✅ Hoàn tất gửi ${sentCount} email nhắc nhở cho concert ${concert.name}`);
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Lỗi trong quá trình chạy cronjob reminder');
    }
  }
}
