import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Concert } from '../entities/concert.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { User, UserRole } from '../entities/user.entity';
import { Guest } from '../entities/guest.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectPinoLogger(AdminService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(Concert) private readonly concertRepo: Repository<Concert>,
    @InjectRepository(Order)   private readonly orderRepo:   Repository<Order>,
    @InjectRepository(Ticket)  private readonly ticketRepo:  Repository<Ticket>,
    @InjectRepository(User)    private readonly userRepo:    Repository<User>,
    @InjectRepository(Guest)   private readonly guestRepo:   Repository<Guest>,
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

  async getOrders(query: import('./dto/admin.dto').GetAdminOrdersQueryDto) {
    const { page = 1, limit = 10, status, search } = query;
    const qb = this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('o.concert', 'concert')
      .leftJoinAndSelect('o.ticketType', 'ticketType')
      .leftJoinAndSelect('o.tickets', 'tickets');

    if (status && status !== 'ALL') {
      qb.andWhere('o.status = :status', { status });
    }

    if (search) {
      qb.andWhere('(o.orderCode ILIKE :search OR user.email ILIKE :search OR user.fullName ILIKE :search OR o.guestEmail ILIKE :search OR o.guestName ILIKE :search)', { search: `%${search}%` });
    }

    qb.orderBy('o.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [orders, total] = await qb.getManyAndCount();

    const data = orders.map(o => {
      const date = o.createdAt.toISOString().split('T')[0];
      return {
        id: o.orderCode,
        date: date,
        event: o.concert?.name || 'Unknown',
        user: o.user?.fullName || o.guestName || 'Unknown User',
        email: o.user?.email || o.guestEmail || 'N/A',
        zone: o.ticketType?.name || 'N/A',
        qty: o.quantity,
        total: Number(o.totalAmount),
        status: o.status,
        tickets: (o.tickets || []).map(t => ({
          code: t.qrCode,
          checkIn: t.status === 'USED' ? (t.updatedAt.toISOString().split('T')[1].substring(0, 5)) : null,
        })),
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── User Management ──────────────────────────────────────────────────────────

  async getUsers(query: import('./dto/admin.dto').GetAdminUsersQueryDto) {
    const { page = 1, limit = 10, role, search } = query;
    const qb = this.userRepo.createQueryBuilder('u');

    if (role && role !== 'ALL') {
      qb.andWhere('u.role = :role', { role });
    }

    if (search) {
      qb.andWhere('(u.email ILIKE :search OR u.fullName ILIKE :search)', { search: `%${search}%` });
    }

    qb.orderBy('u.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [users, total] = await qb.getManyAndCount();

    const data = users.map(u => ({
      id: u.id,
      name: u.fullName || 'Khách',
      email: u.email,
      role: u.role,
      created: u.createdAt.toISOString().split('T')[0],
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserStats() {
    const qb = this.userRepo.createQueryBuilder('u');
    qb.select('u.role', 'role');
    qb.addSelect('COUNT(u.id)', 'count');
    qb.groupBy('u.role');
    const roleStats = await qb.getRawMany();

    const stats = {
      total: 0,
      admin: 0,
      staff: 0,
      organizer: 0,
      audience: 0,
    };

    roleStats.forEach(row => {
      const count = Number(row.count);
      stats.total += count;
      if (row.role === UserRole.STAFF) stats.staff = count;
      else if (row.role === UserRole.ORGANIZER) stats.organizer = count;
      else if (row.role === UserRole.AUDIENCE) stats.audience = count;
    });

    return stats;
  }

  async createUser(data: import('./dto/admin.dto').AdminCreateUserDto) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new BadRequestException('Email đã tồn tại trong hệ thống');
    }

    const hashed = await bcrypt.hash(data.password, 10);
    const user = this.userRepo.create({
      email: normalizedEmail,
      fullName: data.fullName,
      password: hashed,
      role: data.role as UserRole,
      isVerified: true,
    });

    await this.userRepo.save(user);

    return { message: 'Tạo người dùng thành công', user: { id: user.id, email: user.email, role: user.role } };
  }

  async updateUser(userId: string, data: import('./dto/admin.dto').AdminUpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.role !== undefined) user.role = data.role as UserRole;

    await this.userRepo.save(user);

    return { message: 'Cập nhật thành công', user };
  }

  async changeUserPassword(userId: string, data: import('./dto/admin.dto').AdminChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    user.password = await bcrypt.hash(data.newPassword, 12);
    await this.userRepo.save(user);

    return { message: 'Đổi mật khẩu thành công' };
  }

  async deleteUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    await this.userRepo.update(userId, {
      fullName: null,
      phone: null,
      password: null,
      email: `deleted_${userId}@deleted.local`,
    } as any);
    await this.userRepo.softDelete(userId);

    return { message: 'Đã xóa người dùng' };
  }

  // ─── Stats Cards ─────────────────────────────────────────────────────────────

  private async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [revenueResult, ticketsResult, activeEvents, checkedInToday] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('o')
        .select('SUM(o.totalAmount)', 'total')
        .where('o.status = :status', { status: OrderStatus.PAID })
        .getRawOne<{ total: string }>(),

      this.orderRepo
        .createQueryBuilder('o')
        .select('SUM(o.quantity)', 'total')
        .where('o.status = :status', { status: OrderStatus.PAID })
        .getRawOne<{ total: string }>(),

      this.concertRepo
        .createQueryBuilder('c')
        .where('c.date >= :today', { today })
        .andWhere('c.deletedAt IS NULL')
        .getCount(),

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