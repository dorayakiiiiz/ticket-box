import { Controller, Get, Post, Body, Req, UseGuards, Param, BadRequestException } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { JwtAuthGuard } from '../common/guards/jwt.strategy';

@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  /**
   * Lấy danh sách vé đã mua thành công của user hiện tại.
   * Dữ liệu được gom nhóm theo từng Order (đơn hàng).
   */
  @Get('my-tickets')
  @UseGuards(JwtAuthGuard)
  async getMyTickets(@Req() req: any) {
    // ID của user được lấy từ JWT Token đã giải mã
    const userId = req.user.id;
    return this.ticketService.getMyTickets(userId);
  }

  /**
   * Dành cho nhân viên kiểm duyệt quét QR code
   */
  @Post('scan')
  @UseGuards(JwtAuthGuard)
  async scanTicket(@Body('qrCode') qrCode: string) {
    if (!qrCode) {
      throw new BadRequestException('Mã QR không hợp lệ');
    }
    return this.ticketService.scanTicket(qrCode);
  }
}
