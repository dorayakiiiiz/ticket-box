// backend/src/modules/guest/guest-sync.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Guest } from '../entities/guest.entity';

interface BatchSyncGuestJobData {
  items: Array<{ guestId: string; type: string; action: string; scannedAt: string }>;
  syncedAt: string;
}

@Processor('ticketbox.sync-checkins')
export class GuestSyncProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(GuestSyncProcessor.name)
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async process(job: Job<BatchSyncGuestJobData>): Promise<any> {
    const { items, syncedAt } = job.data;

    let success = 0;
    let alreadyCheckedIn = 0;
    let notFound = 0;

    this.logger.info(`Processing guest batch sync: ${items.length} items`);

    for (const item of items) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const guest = await manager.findOne(Guest, {
            where: { id: item.guestId  },
          });

          if (!guest) {
            notFound++;
            this.logger.warn(`Guest not found: ${item.guestId}`);
            return;
          }

          if (!guest.isCheckedIn) {
            guest.isCheckedIn = true;
            await manager.save(guest);
            success++;
            this.logger.debug(`Guest ${guest.guestCode} checked in successfully`);
          } else {
            alreadyCheckedIn++;
            this.logger.debug(`Guest ${guest.guestCode} already checked in`);
          }
        });
      } catch (error) {
        this.logger.error(`Failed to sync guest ${item.guestId }:`, error);
      }
    }

    this.logger.info(
      `Guest batch sync completed: success=${success}, already=${alreadyCheckedIn}, notFound=${notFound}`,
    );

    return {
      success: true,
      total: items.length,
      successCount: success,
      alreadyCheckedIn,
      notFound,
    };
  }
}