import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  /**
   * Lấy danh sách vé đã mua của một user, gom nhóm theo Order (đơn hàng).
   * Chỉ lấy những đơn hàng đã thanh toán thành công (PAID).
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

    // Nếu muốn, có thể check xem Order có đang PAID không
    if (ticket.order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Đơn hàng chứa vé này chưa được thanh toán thành công.');
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
