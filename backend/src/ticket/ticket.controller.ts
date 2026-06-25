import { Controller, Get, Post, Body, Req, Param, BadRequestException, Query } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { Public } from 'src/common/guards/jwt.strategy';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/entities/user.entity';

@Controller('tickets')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
  ) { }

  @Get('my-tickets')
  async getMyTickets(@Req() req: any) {
    const userId = req.user.id;
    return this.ticketService.getMyTickets(userId);
  }

  /// Sync ticket về điện thoại (dùng 1 lần sáng)
  @Roles(UserRole.ORGANIZER, UserRole.STAFF)
  @Get('/sync/:concertId')
  findTicketsByConcert(@Param('concertId') id: string) {
    return this.ticketService.findTicketByConcertId(id);
  }



  /// Quét vé (Online-First) - Nhận ticketId thay vì qrCode
  @Roles(UserRole.ORGANIZER, UserRole.STAFF)
  @Post('/scan')
  async scanTicketNew(@Body() body: { ticketId: string; concertId: string; scannedAt: string }) {
    if (!body.ticketId) {
      throw new BadRequestException('Ticket ID không hợp lệ');
    }
    return this.ticketService.scanTicketById(body.ticketId, body.scannedAt);
  }

  ///Đồng bộ hàng loạt từ sync_queue
  @Roles(UserRole.ORGANIZER, UserRole.STAFF)
  @Post('/sync/batch')
  async batchSync(@Body() body: { queue: any[]; syncedAt: string }) {
    if (!body.queue || body.queue.length === 0) {
      throw new BadRequestException('Không có dữ liệu để đồng bộ');
    }

    const result = await this.ticketService.batchSync(body.queue);
    return result;
  }

  /// 3. Kéo các thay đổi từ Server (từ lần sync cuối)
  @Roles(UserRole.ORGANIZER, UserRole.STAFF)
  @Get('/changes')
  async getChangesSince(
    @Query('concertId') concertId: string,
    @Query('since') since: string,
  ) {
    if (!concertId) {
      throw new BadRequestException('concertId là bắt buộc');
    }

    const sinceDate = since ? new Date(since) : new Date(0);
    const changes = await this.ticketService.getChangesSince(concertId, sinceDate);
    return changes;
  }
}