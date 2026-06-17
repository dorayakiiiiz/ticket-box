import { Controller, Get, Post, Body, Req, Param, BadRequestException } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { Public } from 'src/common/guards/jwt.strategy';

@Controller('tickets')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
  ) { }



  @Get('/sync/:concertId')
  findTicketsByConcert(@Param('concertId') id: string) {
    return this.ticketService.findTicketByConcertId(id);
  }

  /**
   * Lấy danh sách vé đã mua thành công của user hiện tại.
   * Dữ liệu được gom nhóm theo từng Order (đơn hàng).
   */
  @Get('my-tickets')
  async getMyTickets(@Req() req: any) {
    // ID của user được lấy từ JWT Token đã giải mã
    const userId = req.user.id;
    return this.ticketService.getMyTickets(userId);
  }

  /**
   * Dành cho nhân viên kiểm duyệt quét QR code
   */
  @Post('scan')
  async scanTicket(@Body('qrCode') qrCode: string) {
    if (!qrCode) {
      throw new BadRequestException('Mã QR không hợp lệ');
    }
    return this.ticketService.scanTicket(qrCode);
  }


  /**
 * Đồng bộ danh sách vé đã check-in từ local lên server.
 * Dùng queue để xử lý bất đồng bộ, tránh race condition.
 */
  @Post('/sync/checkins')
  async syncCheckins(@Body() body: { checkins: Array<{ id: string; timestamp: string }> }, @Req() req: any) {
    if (!body.checkins || body.checkins.length === 0) {
      throw new BadRequestException('Không có dữ liệu check-in');
    }

    const result = await this.ticketService.syncCheckins(
      body.checkins
    );

    return result;
  }
}