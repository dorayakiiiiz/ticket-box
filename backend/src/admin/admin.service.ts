import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Concert } from '../entities/concert.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectPinoLogger(AdminService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(Concert) private readonly concertRepo: Repository<Concert>,
    @InjectRepository(Order)   private readonly orderRepo:   Repository<Order>,
    @InjectRepository(Ticket)  private readonly ticketRepo:  Repository<Ticket>,
  ) {}

  async getDashboard(range: '7d' | '30d') {
    this.logger.info({ range }, 'getDashboard called');
    const days = range === '30d' ? 30 : 7;
    const [stats, revenueChart, concertPerformance] = await Promise.all([
      this.getStats(),
      this.getRevenueChart(days),
      this.getConcertPerformance(),
    ]);
    return { stats, revenueChart, concertPerformance };
  }

  // ─── Stats Cards ─────────────────────────────────────────────────────────────

  private async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [revenueResult, ticketsResult, activeEvents, checkedInToday] = await Promise.all([
      // Tổng doanh thu từ đơn PAID
      this.orderRepo
        .createQueryBuilder('o')
        .select('SUM(o.totalAmount)', 'total')
        .where('o.status = :status', { status: OrderStatus.PAID })
        .getRawOne<{ total: string }>(),

      // Tổng vé đã bán (quantity trong đơn PAID)
      this.orderRepo
        .createQueryBuilder('o')
        .select('SUM(o.quantity)', 'total')
        .where('o.status = :status', { status: OrderStatus.PAID })
        .getRawOne<{ total: string }>(),

      // Sự kiện chưa diễn ra (date >= hôm nay, chưa xóa mềm)
      this.concertRepo
        .createQueryBuilder('c')
        .where('c.date >= :today', { today })
        .andWhere('c.deletedAt IS NULL')
        .getCount(),

      // Số vé check-in hôm nay (ticket status = USED, updatedAt >= đầu ngày)
      this.ticketRepo
        .createQueryBuilder('t')
        .where('t.status = :status', { status: TicketStatus.USED })
        .andWhere('t.updatedAt >= :today', { today })
        .getCount(),
    ]);

    return {
      totalRevenue: parseFloat(revenueResult?.total ?? '0'),
      totalTicketsSold: parseInt(ticketsResult?.total ?? '0', 10),
      activeEvents,
      checkedInToday,
      updatedAt: new Date().toISOString(),
    };
  }

  // ─── Revenue Chart ────────────────────────────────────────────────────────────

  private async getRevenueChart(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select("TO_CHAR(DATE_TRUNC('day', o.createdAt), 'DD/MM')", 'label')
      .addSelect('SUM(o.totalAmount)', 'revenue')
      .addSelect('SUM(o.quantity)', 'tickets')
      .where('o.status = :status', { status: OrderStatus.PAID })
      .andWhere('o.createdAt >= :since', { since })
      .groupBy("DATE_TRUNC('day', o.createdAt)")
      .orderBy("DATE_TRUNC('day', o.createdAt)", 'ASC')
      .getRawMany<{ label: string; revenue: string; tickets: string }>();

    return rows.map(r => ({
      label: r.label,
      revenue: parseFloat(r.revenue ?? '0'),
      tickets: parseInt(r.tickets ?? '0', 10),
    }));
  }

  // ─── Concert Performance ──────────────────────────────────────────────────────

  private async getConcertPerformance() {
    // Dùng query builder join concerts → ticket_types → orders để tính sold% và revenue
    const rows = await this.concertRepo
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .addSelect('c.name', 'name')
      .addSelect('COALESCE(SUM(tt.soldQuantity), 0)', 'soldQuantity')
      .addSelect('COALESCE(SUM(tt.totalQuantity), 0)', 'totalQuantity')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
      .leftJoin('c.ticketTypes', 'tt')
      .leftJoin(Order, 'o', 'o.concertId = c.id AND o.status = :paid', { paid: OrderStatus.PAID })
      .where('c.deletedAt IS NULL')
      .groupBy('c.id')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany<{
        id: string;
        name: string;
        soldQuantity: string;
        totalQuantity: string;
        revenue: string;
      }>();

    return rows.map(r => {
      const sold = parseInt(r.soldQuantity, 10);
      const total = parseInt(r.totalQuantity, 10);
      return {
        id: r.id,
        name: r.name,
        soldQuantity: sold,
        totalQuantity: total,
        soldPercent: total > 0 ? Math.round((sold / total) * 100) : 0,
        revenue: parseFloat(r.revenue),
      };
    });
  }
}
