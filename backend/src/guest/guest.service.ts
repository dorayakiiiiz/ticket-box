// backend/src/guest/guest.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { Concert } from '../entities/concert.entity';
import { Order } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { Guest } from '../entities/guest.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class GuestService {
  constructor(
    @InjectPinoLogger(GuestService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(Concert) private readonly concertRepo: Repository<Concert>,
    @InjectRepository(Order)   private readonly orderRepo:   Repository<Order>,
    @InjectRepository(Ticket)  private readonly ticketRepo:  Repository<Ticket>,
    @InjectRepository(User)    private readonly userRepo:    Repository<User>,
    @InjectRepository(Guest)   private readonly guestRepo:   Repository<Guest>,
    @InjectQueue('ticketbox.sync-checkins')
    private readonly syncQueue: Queue,
  ) {}

  async getGuests(query: import('./dto/guest.dto').GetAdminGuestsQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const qb = this.guestRepo.createQueryBuilder('g')
      .leftJoinAndSelect('g.concert', 'concert');

    if (search) {
      qb.andWhere('(g.fullName ILIKE :search OR g.email ILIKE :search OR g.phone ILIKE :search)', { search: `%${search}%` });
    }

    qb.orderBy('g.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [guests, total] = await qb.getManyAndCount();

    const data = guests.map(g => ({
      id: g.id,
      name: g.fullName,
      email: g.email || 'N/A',
      phone: g.phone || 'N/A',
      guestCode: g.guestCode,
      concert: g.concert?.name || 'N/A',
      checkedIn: g.isCheckedIn,
      created: g.createdAt.toISOString().split('T')[0],
      updatedAt: g.updatedAt, // ✅ Thêm updatedAt vào response
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createGuest(data: import('./dto/guest.dto').AdminCreateGuestDto) {
    const concert = await this.concertRepo.findOne({ where: { id: data.concertId } });
    if (!concert) throw new NotFoundException('Không tìm thấy sự kiện');

    const guestCode = this.generateGuestCode();

    const guestData: Partial<Guest> = {
      fullName: data.fullName,
      guestCode,
      concert,
      isCheckedIn: false,
      createdAt: new Date(), // ✅ Set thủ công
      updatedAt: new Date(), // ✅ Set thủ công
    };

    if (data.email !== undefined && data.email !== null && data.email !== '') {
      guestData.email = data.email;
    }
    if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
      guestData.phone = data.phone;
    }

    const guest = this.guestRepo.create(guestData);
    await this.guestRepo.save(guest);

    return {
      message: 'Tạo khách mời thành công',
      guest: {
        id: guest.id,
        guestCode: guest.guestCode,
        fullName: guest.fullName,
        updatedAt: guest.updatedAt, // ✅ Trả về updatedAt
      },
    };
  }

  async updateGuest(guestId: string, data: import('./dto/guest.dto').AdminUpdateGuestDto) {
    const guest = await this.guestRepo.findOne({ where: { id: guestId } });
    if (!guest) throw new NotFoundException('Không tìm thấy khách mời');

    let hasChanges = false;

    if (data.fullName !== undefined && data.fullName !== null) {
      guest.fullName = data.fullName;
      hasChanges = true;
    }
    if (data.email !== undefined && data.email !== null) {
      guest.email = data.email;
      hasChanges = true;
    }
    if (data.phone !== undefined && data.phone !== null) {
      guest.phone = data.phone;
      hasChanges = true;
    }
    if (data.isCheckedIn !== undefined && data.isCheckedIn !== null) {
      guest.isCheckedIn = data.isCheckedIn;
      hasChanges = true;
    }

    if (hasChanges) {
      guest.updatedAt = new Date(); // ✅ Set thủ công mỗi khi có thay đổi
      await this.guestRepo.save(guest);
    }

    return { 
      message: 'Cập nhật khách mời thành công', 
      guest: {
        ...guest,
        updatedAt: guest.updatedAt,
      }
    };
  }

  async deleteGuest(guestId: string) {
    const guest = await this.guestRepo.findOne({ where: { id: guestId } });
    if (!guest) throw new NotFoundException('Không tìm thấy khách mời');

    await this.guestRepo.delete(guestId);

    return { message: 'Đã xóa khách mời' };
  }

  async importGuestsFromCSV(concertId: string, fileBuffer: Buffer): Promise<{ message: string; stats: { imported: number; failed: number; total: number } }> {
    const concert = await this.concertRepo.findOne({ where: { id: concertId } });
    if (!concert) throw new NotFoundException('Không tìm thấy sự kiện');

    return new Promise((resolve, reject) => {
      const batchData: Partial<Guest>[] = [];
      const BATCH_SIZE = 500;
      let successCount = 0;
      let errorCount = 0;
      let totalRows = 0;
      let isProcessing = false;
      let isEnded = false;

      const stream = Readable.from(fileBuffer.toString());

      stream
        .pipe(csv({}))
        .on('data', async (row) => {
          stream.pause();
          isProcessing = true;

          try {
            totalRows++;

            const fullName = row.fullName || row.name || row['Họ và tên'] || row['Họ tên'];
            const email = row.email || row['Email'];
            const phone = row.phone || row['Số điện thoại'] || row['SĐT'] || row['Phone'];

            if (!fullName || !fullName.trim()) {
              errorCount++;
              stream.resume();
              return;
            }

            const guestCode = this.generateGuestCode();

            const guest: Partial<Guest> = {
              fullName: fullName.trim(),
              guestCode,
              concert,
              isCheckedIn: false,
              createdAt: new Date(), // ✅ Set thủ công
              updatedAt: new Date(), // ✅ Set thủ công
            };

            if (email && email.trim()) guest.email = email.trim();
            if (phone && phone.trim()) guest.phone = phone.trim();

            batchData.push(guest);

            if (batchData.length >= BATCH_SIZE) {
              const dataToInsert = [...batchData];
              batchData.length = 0;

              try {
                // ✅ Cập nhật updatedAt cho batch insert
                await this.guestRepo
                  .createQueryBuilder()
                  .insert()
                  .into(Guest)
                  .values(dataToInsert)
                  .orUpdate(
                    ['fullName', 'email', 'phone', 'updatedAt'],
                    ['guestCode']
                  )
                  .setParameter('updatedAt', new Date()) // ✅ Set giá trị mới
                  .execute();
                successCount += dataToInsert.length;
                this.logger.debug({ count: dataToInsert.length }, 'Batch inserted');
              } catch (err) {
                this.logger.error({ err }, 'Batch insert failed, falling back to single insert');
                for (const g of dataToInsert) {
                  try {
                    g.updatedAt = new Date(); // ✅ Set thủ công
                    await this.guestRepo.save(g);
                    successCount++;
                  } catch (e) {
                    this.logger.error({ err: e, guest: g }, 'Single insert failed');
                    errorCount++;
                  }
                }
              }
            }

            isProcessing = false;
            stream.resume();

          } catch (err) {
            this.logger.error({ err, row }, 'Error parsing CSV row');
            errorCount++;
            isProcessing = false;
            stream.resume();
          }
        })
        .on('end', async () => {
          isEnded = true;

          if (batchData.length > 0) {
            try {
              // ✅ Cập nhật updatedAt cho final batch
              await this.guestRepo
                .createQueryBuilder()
                .insert()
                .into(Guest)
                .values(batchData)
                .orUpdate(
                  ['fullName', 'email', 'phone', 'updatedAt'],
                  ['guestCode']
                )
                .setParameter('updatedAt', new Date()) // ✅ Set giá trị mới
                .execute();
              successCount += batchData.length;
              this.logger.debug({ count: batchData.length }, 'Final batch inserted');
            } catch (err) {
              this.logger.error({ err }, 'Final batch insert failed, falling back to single insert');
              for (const g of batchData) {
                try {
                  g.updatedAt = new Date(); // ✅ Set thủ công
                  await this.guestRepo.save(g);
                  successCount++;
                } catch (e) {
                  this.logger.error({ err: e, guest: g }, 'Single insert failed');
                  errorCount++;
                }
              }
            }
          }

          this.logger.info({ successCount, errorCount, totalRows }, '✅ CSV import complete');

          resolve({
            message: 'Import CSV thành công',
            stats: {
              imported: successCount,
              failed: errorCount,
              total: totalRows,
            },
          });
        })
        .on('error', (error) => {
          this.logger.error({ error }, 'CSV stream error');
          reject(new BadRequestException(`Lỗi đọc CSV: ${error.message}`));
        });
    });
  }

  async findGuestsByConcert(concertId: string) {
    const concert = await this.concertRepo.findOne({ where: { id: concertId } });
    if (!concert) throw new NotFoundException('Concert không tồn tại ');

    const guests = await this.guestRepo
      .createQueryBuilder('guest')
      .where('guest.concertId = :concertId', { concertId })
      .orderBy('guest.createdAt', 'DESC')
      .getMany();

    return guests.map(guest => ({
      id: guest.id,
      guestCode: guest.guestCode,
      fullName: guest.fullName,
      email: guest.email,
      phone: guest.phone,
      isCheckedIn: guest.isCheckedIn,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
    }));
  }

  async scanGuestById(guestId: string, scannedAt: string) {
    const guest = await this.guestRepo.findOne({
      where: { id: guestId },
    });

    if (!guest) {
      throw new NotFoundException('Không tìm thấy khách mời hợp lệ.');
    }

    if (guest.isCheckedIn) {
      throw new BadRequestException('Khách mời này đã check-in trước đó.');
    }

    guest.isCheckedIn = true;
    guest.updatedAt = new Date(); // ✅ Set thủ công
    await this.guestRepo.save(guest);

    return {
      success: true,
      message: 'Check-in thành công!',
      checkedInAt: scannedAt || new Date().toISOString(),
      guestId: guest.id,
      guestCode: guest.guestCode,
      fullName: guest.fullName,
      updatedAt: guest.updatedAt,
    };
  }

  async batchSyncGuests(items: any[]) {
    const job = await this.syncQueue.add('process-batch-sync-guests', {
      items,
      syncedAt: new Date().toISOString(),
      type: 'GUEST',
    });

    return {
      success: true,
      message: 'Đang đồng bộ danh sách khách mời với hệ thống',
      jobId: job.id,
      total: items.length,
    };
  }

  async getGuestChangesSince(concertId: string, since: Date) {
    try {
      console.log('🔍 [getGuestChangesSince]', { 
        concertId, 
        since: since.toISOString(), // ✅ Log rõ ràng
      });

      const guests = await this.guestRepo
        .createQueryBuilder('guest')
        .where('guest.concertId = :concertId', { concertId })
        .andWhere('guest.updatedAt > :since', { since })
        .orderBy('guest.updatedAt', 'DESC')
        .getMany();

      console.log(`✅ Found ${guests.length} guests updated since ${since.toISOString()}`);

      return guests.map(guest => ({
        id: guest.id,
        guestCode: guest.guestCode,
        fullName: guest.fullName,
        email: guest.email,
        phone: guest.phone,
        isCheckedIn: guest.isCheckedIn,
        updatedAt: guest.updatedAt, // ✅ Trả về Date object
      }));
    } catch (error) {
      console.error('[getGuestChangesSince] Error:', error);
      return [];
    }
  }

  private generateGuestCode(): string {
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    return `VIP-${randomHex}`;
  }
}