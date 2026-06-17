import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
    @InjectQueue('ticketbox.sync-checkins')
    private readonly syncQueue: Queue,
  ) { }

  /**
   * Lấy danh sách vé của một concert cụ thể 
   */

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
    }));
  }


  async syncCheckins(
    checkins: Array<{ id: string; timestamp: string }>,
  ) {
    // Thêm job vào queue
    const job = await this.syncQueue.add('process-checkins', {
      checkins
    });

    return {
      status: 'SUCCESS',
      message: 'Đang đồng bộ với hệ thống',
      jobId: job.id,
      total: checkins.length,
    };
  }

  /**
   * Lấy danh sách vé đã mua của một user
   */
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
        createdAt: 'DESC', // Đơn hàng mới mua nhất hiển thị lên đầu
      },
    });

    // Format lại dữ liệu gọn gàng để FE dễ dùng
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
          qrCode: t.qrCode, // Frontend sẽ gen ảnh mã QR từ payload này
          status: t.status, // Trạng thái vé (UNUSED, VALID, USED)
        })),
      };
    });
  }

  /**
   * API quét vé (chuyển trạng thái từ UNUSED sang USED)
   */
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

    if (ticket.status === 'USED') {
      throw new BadRequestException('Vé này đã được sử dụng trước đó.');
    }

    // Cập nhật trạng thái vé thành đã sử dụng
    // ticket.status = 'USED';
    await this.ticketRepo.save(ticket);

    return {
      message: 'Quét vé thành công! Vé hợp lệ.',
      ticketInfo: {
        id: ticket.id,
        concertName: ticket.order.concert.name,
        ticketType: ticket.order.ticketType.name,
        usedAt: new Date(),
      },
    };
  }
}
