import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../common/guards/jwt.strategy';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Endpoint: GET /tickets/my-tickets
   * Lấy toàn bộ danh sách vé đã mua thành công của user hiện tại.
   * Dữ liệu được gom nhóm theo từng Order (đơn hàng).
   */
  @Get('my-tickets')
  @UseGuards(JwtAuthGuard)
  async getMyTickets(@Req() req: any) {
    // ID của user được lấy từ JWT Token đã giải mã bởi JwtAuthGuard
    const userId = req.user.id;
    return this.ticketsService.getMyTickets(userId);
  }
}
