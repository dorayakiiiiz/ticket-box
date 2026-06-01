import { Controller, Get, Post, Put, Delete, Param, Body, Req, UploadedFile, UseInterceptors, BadRequestException, HttpCode, HttpStatus, Header } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConcertService } from './concert.service';
import { CreateConcertDto, UpdateConcertDto } from './dto/concert.dto';
import { Public } from 'src/common/guards/jwt.strategy';

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

// Multer fileFilter — chặn non-PDF trước khi load vào memory
const pdfFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const isPdf = file.mimetype === 'application/pdf' && file.originalname.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return cb(new BadRequestException('Chỉ chấp nhận file PDF'), false);
  }
  cb(null, true);
};

@Controller('concerts')
export class ConcertController {
  constructor(private readonly concertService: ConcertService) { }

  @Public()
  @Get()
  findAll() {
    return this.concertService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.concertService.findOne(id);
  }

  // Endpoint đọc số vé còn lại từ Redis — dùng bởi SWR client poll 5 giây
  // Cache-Control: s-maxage=5 cho CDN/proxy hấp thụ thundering herd khi concert hot
  @Public()
  @Get(':id/availability')
  @Header('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10')
  getAvailability(@Param('id') id: string) {
    return this.concertService.getAvailability(id);
  }

  @Post()
  create(@Body() dto: CreateConcertDto, @Req() req: any) {
    return this.concertService.create(dto, req.user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConcertDto, @Req() req: any) {
    return this.concertService.update(id, dto, req.user);
  }

  @Post(':id/upload-bio')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    fileFilter: pdfFileFilter,
    limits: { fileSize: MAX_PDF_SIZE },
  }))
  uploadBio(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file PDF');
    return this.concertService.uploadBio(id, file, req.user);
  }

  @Post(':id/reset-bio')
  resetBio(@Param('id') id: string, @Req() req: any) {
    return this.concertService.resetBioStatus(id, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.concertService.remove(id, req.user);
  }
}
