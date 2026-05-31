import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Concert } from '../entities/concert.entity';
import { UserRole } from '../entities/user.entity';
import { CreateConcertDto, UpdateConcertDto } from './dto/concert.dto';

const AI_BIO_QUEUE = 'ticketbox.concert.ai-bio';

@Injectable()
export class ConcertService {
  constructor(
    @InjectRepository(Concert) private readonly concertRepo: Repository<Concert>,
    @InjectQueue(AI_BIO_QUEUE) private readonly aiBioQueue: Queue,
  ) {}

  findAll() {
    return this.concertRepo.find({ relations: { ticketTypes: true } });
  }

  async findOne(id: string) {
    const concert = await this.concertRepo.findOne({ where: { id }, relations: { ticketTypes: true } });
    if (!concert) throw new NotFoundException('Concert không tồn tại');
    return concert;
  }

  async create(dto: CreateConcertDto, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền tạo concert');
    }
    const concert = this.concertRepo.create(dto);
    return this.concertRepo.save(concert);
  }

  async update(id: string, dto: UpdateConcertDto, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền cập nhật concert');
    }
    await this.findOne(id); // throw 404 nếu không tồn tại
    await this.concertRepo.update(id, dto as any);
    return this.findOne(id);
  }

  async uploadBio(id: string, file: Express.Multer.File, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền upload');
    }

    const concert = await this.findOne(id);

    // Chặn upload trùng — tránh race condition 2 worker chạy song song
    if (concert.aiBioStatus === 'PROCESSING') {
      throw new ConflictException('AI Bio đang được xử lý, vui lòng chờ');
    }

    await this.concertRepo.update(id, { aiBioStatus: 'PROCESSING' });

    await this.aiBioQueue.add(
      'process-pdf-bio',
      { concertId: id, pdfBuffer: file.buffer.toString('base64') },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: { count: 100 }, // Giữ tối đa 100 failed jobs để debug
      },
    );

    return { message: 'AI Bio đang được xử lý' };
  }

  // Reset status kẹt PROCESSING → IDLE để upload lại
  async resetBioStatus(id: string, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền thao tác');
    }
    const concert = await this.findOne(id);
    if (concert.aiBioStatus !== 'PROCESSING' && concert.aiBioStatus !== 'FAILED') {
      throw new ConflictException('Chỉ reset được khi đang PROCESSING hoặc FAILED');
    }
    await this.concertRepo.update(id, { aiBioStatus: 'IDLE', aiBio: '' });
    return { message: 'Đã reset AI Bio status' };
  }

  async remove(id: string, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException('Chỉ ban tổ chức mới có quyền xóa concert');
    }
    const concert = await this.findOne(id);
    await this.concertRepo.remove(concert);
  }
}
