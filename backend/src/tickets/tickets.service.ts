import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  /**
   * Lấy danh sách vé đã mua của một user, gom nhóm theo Order (đơn hàng).
   * Chỉ lấy những đơn hàng đã thanh toán thành công (PAID).
   * Dữ liệu trả về sẽ bao gồm đầy đủ chi tiết Concert để frontend dễ dựng giao diện.
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
        createdAt: 'DESC', // Đơn hàng mới mua nhất sẽ hiển thị lên đầu
      },
    });

    // Map lại cấu trúc dữ liệu gọn gàng để FE dễ dùng (tránh bóp méo thông tin nhạy cảm)
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
          qrCode: t.qrCode, // Frontend sẽ dùng cái này để gen ra ảnh QR Code
          status: t.status, // Trạng thái vé (VALID, USED...)
        })),
      };
    });
  }
}
