import { Controller, Get, Post, Body, Req, Param, BadRequestException } from '@nestjs/common';
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

  // sync ticket về điện thoại
  @Roles(UserRole.ORGANIZER, UserRole.STAFF)
  @Get('/sync/:concertId')
  findTicketsByConcert(@Param('concertId') id: string) {
    return this.ticketService.findTicketByConcertId(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.STAFF)
  @Post('scan')
  async scanTicket(@Body('qrCode') qrCode: string) {
    if (!qrCode) {
      throw new BadRequestException('Mã QR không hợp lệ');
    }
    return this.ticketService.scanTicket(qrCode);
  }

  @Roles(UserRole.ORGANIZER, UserRole.STAFF)
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