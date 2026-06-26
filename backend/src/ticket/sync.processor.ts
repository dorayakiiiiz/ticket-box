// backend/src/modules/ticket/sync.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Ticket, TicketStatus } from '../entities/ticket.entity';

interface BatchSyncJobData {
  items: Array<{ ticketId: string; type: string; action: string; scannedAt: string }>;
  syncedAt: string;
}

@Processor('ticketbox.sync-checkins')
export class SyncCheckinProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(SyncCheckinProcessor.name)
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async process(job: Job<BatchSyncJobData>): Promise<any> {
    const { items, syncedAt } = job.data;

    let success = 0;
    let alreadyCheckedIn = 0;
    let notFound = 0;

    this.logger.info(`Processing batch sync: ${items.length} items`);

    for (const item of items) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const ticket = await manager.findOne(Ticket, {
            where: { id: item.ticketId },
          });

          if (!ticket) {
            notFound++;
            this.logger.warn(`Ticket not found: ${item.ticketId}`);
            return;
          }

          if (ticket.status === TicketStatus.VALID) {
            ticket.status = TicketStatus.USED;
            ticket.updatedAt = new Date(item.scannedAt || syncedAt);
            await manager.save(ticket);
            success++;
            this.logger.debug(`Ticket ${item.ticketId} checked in successfully`);
          } else {
            alreadyCheckedIn++;
            this.logger.debug(`Ticket ${item.ticketId} already used`);
          }
        });
      } catch (error) {
        this.logger.error(`Failed to sync ticket ${item.ticketId}:`, error);
      }
    }

    this.logger.info(
      `Batch sync completed: success=${success}, already=${alreadyCheckedIn}, notFound=${notFound}`,
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