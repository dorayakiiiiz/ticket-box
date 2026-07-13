// backend/src/guest/guest.controller.ts
import { Controller, Get, Patch, Delete, Body, Param, Query, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GuestService } from './guest.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/entities/user.entity';
import { GetAdminGuestsQueryDto, AdminCreateGuestDto, AdminUpdateGuestDto } from './dto/guest.dto';

@Controller('guests')
@Roles(UserRole.ORGANIZER, UserRole.STAFF)
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  // ============ ADMIN ENDPOINTS ============

  @Post('')
  createGuest(@Body() body: AdminCreateGuestDto) {
    return this.guestService.createGuest(body);
  }

  @Get('')
  getGuests(@Query() query: GetAdminGuestsQueryDto) {
    return this.guestService.getGuests(query);
  }

  @Patch(':id')
  updateGuest(@Param('id') id: string, @Body() body: AdminUpdateGuestDto) {
    return this.guestService.updateGuest(id, body);
  }

  @Delete(':id')
  deleteGuest(@Param('id') id: string) {
    return this.guestService.deleteGuest(id);
  }

  @Post('import-csv/:concertId')
  @UseInterceptors(FileInterceptor('file'))
  importGuestsCSV(
    @Param('concertId') concertId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('File không được upload');
    }
    return this.guestService.importGuestsFromCSV(concertId, file.buffer);
  }

  // ============ SYNC ENDPOINTS (cho Flutter) ============

  /// Sync guest về điện thoại
  @Get('sync/:concertId')
  findGuestsByConcert(@Param('concertId') concertId: string) {
    return this.guestService.findGuestsByConcert(concertId);
  }

  /// Quét Guest (Online-First)
  @Post('scan')
  async scanGuest(@Body() body: { guestId: string; concertId: string; scannedAt: string }) {
    if (!body.guestId) {
      throw new BadRequestException('Guest ID không hợp lệ');
    }
    return this.guestService.scanGuestById(body.guestId, body.scannedAt);
  }

  /// Đồng bộ hàng loạt từ sync_queue cho Guest
  @Post('sync/batch')
  async batchSyncGuests(@Body() body: { queue: any[]; syncedAt: string }) {
    if (!body.queue || body.queue.length === 0) {
      throw new BadRequestException('Không có dữ liệu để đồng bộ');
    }
    return this.guestService.batchSyncGuests(body.queue);
  }

  /// Kéo các thay đổi của Guest từ Server
  @Get('changes')
  async getGuestChangesSince(
    @Query('concertId') concertId: string,
    @Query('since') since: string,
  ) {
    if (!concertId) {
      throw new BadRequestException('concertId là bắt buộc');
    }
    const sinceDate = since ? new Date(since) : new Date(0);
    return this.guestService.getGuestChangesSince(concertId, sinceDate);
  }
}