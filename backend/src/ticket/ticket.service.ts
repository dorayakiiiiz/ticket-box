// backend/src/ticket/ticket.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { Concert } from '../entities/concert.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Concert) private readonly concertRepo: Repository<Concert>,
    
    @InjectQueue('ticketbox.sync-checkins')
    private readonly syncQueue: Queue,
  ) { }

  async findTicketByConcertId(id: string) {
    const concert = await this.concertRepo.findOne({ where: { id } });
    if (!concert) throw new NotFoundException('Concert không tồn tại');

    const tickets = await this.ticketRepo
      .createQueryBuilder('ticket')
      .innerJoin('ticket.order', 'order')
      .innerJoin('order.ticketType', 'ticketType')
      .innerJoin('ticketType.concert', 'concert')
      .where('concert.id = :id', { id })
      .getMany();

    return tickets.map(ticket => ({
      id: ticket.id,
      qrPayload: ticket.qrCode,
      status: ticket.status,
      updatedAt: ticket.updatedAt, 
    }));
  }

  async getMyTickets(userId: string) {
    const orders = await this.orderRepo.find({
      where: {
        user: { id: userId },
        status: OrderStatus.PAID,
      },
      relations: {
        concert: true,
        ticketType: true,
        tickets: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return orders.map((order) => {
      const concert = order.concert;
      return {
        orderId: order.id,
        orderCode: order.orderCode,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        quantity: order.quantity,
        concert: {
          id: concert.id,
          name: concert.name,
          date: concert.date,
          city: concert.city,
          venue: concert.venue,
        },
        ticketType: {
          name: order.ticketType.name,
          price: order.ticketType.price,
        },
        tickets: order.tickets.map((t) => ({
          id: t.id,
          qrCode: t.qrCode,
          status: t.status,
          updatedAt: t.updatedAt, // ✅ Thêm updatedAt
        })),
      };
    });
  }

  async scanTicket(qrCode: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { qrCode },
      relations: {
        order: {
          concert: true,
          ticketType: true,
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy vé hợp lệ với mã QR này.');
    }

    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException('Vé này đã được sử dụng trước đó.');
    }

    // Cập nhật trạng thái vé thành đã sử dụng
    ticket.status = TicketStatus.USED;
    ticket.updatedAt = new Date(); 
    await this.ticketRepo.save(ticket);

    return {
      message: 'Quét vé thành công! Vé hợp lệ.',
      ticketInfo: {
        id: ticket.id,
        concertName: ticket.order.concert.name,
        ticketType: ticket.order.ticketType.name,
        usedAt: new Date(),
        updatedAt: ticket.updatedAt, 
      },
    };
  }

  async scanTicketById(ticketId: string, scannedAt: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: {
        order: {
          concert: true,
          ticketType: true,
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy vé hợp lệ.');
    }

    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException('Vé này đã được sử dụng trước đó.');
    }

    // Cập nhật trạng thái
    ticket.status = TicketStatus.USED;
    ticket.updatedAt = new Date(); 
    await this.ticketRepo.save(ticket);

    return {
      success: true,
      message: 'Quét vé thành công!',
      checkedInAt: scannedAt || new Date().toISOString(),
      ticketId: ticket.id,
      updatedAt: ticket.updatedAt, // ✅ Trả về updatedAt
    };
  }

  /**
   * Đồng bộ hàng loạt từ sync_queue - Đưa vào Queue xử lý bất đồng bộ
   */
  async batchSync(items: any[]) {
    // 🔥 Đưa vào Queue thay vì xử lý trực tiếp
    const job = await this.syncQueue.add('process-batch-sync', {
      items,
      syncedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Đang đồng bộ danh sách vé với hệ thống',
      jobId: job.id,
      total: items.length,
    };
  }

  /**
   * Kéo các thay đổi từ Server (từ lần sync cuối)
   */
  async getChangesSince(concertId: string, since: Date) {
    console.log('🔍 [getChangesSince]', {
      concertId,
      since: since.toISOString(), 
    });

    // Lấy tất cả vé của concert đã được update sau thời điểm since
    const tickets = await this.ticketRepo
      .createQueryBuilder('ticket')
      .innerJoin('ticket.order', 'order')
      .innerJoin('order.ticketType', 'ticketType')
      .innerJoin('ticketType.concert', 'concert')
      .where('concert.id = :concertId', { concertId })
      .andWhere('ticket.updatedAt > :since', { since })
      .getMany();

    console.log(`Found ${tickets.length} tickets updated since ${since.toISOString()}`);

    return tickets.map(ticket => ({
      id: ticket.id,
      qrCode: ticket.qrCode,
      status: ticket.status,
      checkedInAt: ticket.updatedAt, 
      updatedAt: ticket.updatedAt, 
    }));
  }

  /**
   * Cập nhật ticket - Set thủ công updatedAt
   */
  async updateTicket(ticketId: string, data: any) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy vé');
    }

    // Cập nhật các field
    if (data.status !== undefined) {
      ticket.status = data.status;
    }
    // Các field khác...

    ticket.updatedAt = new Date(); 
    await this.ticketRepo.save(ticket);

    return {
      success: true,
      message: 'Cập nhật vé thành công',
      ticket: {
        id: ticket.id,
        status: ticket.status,
        updatedAt: ticket.updatedAt,
      },
    };
  }
}