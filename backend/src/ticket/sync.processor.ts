// backend/src/modules/ticket/sync.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Ticket, TicketStatus } from '../entities/ticket.entity';

interface SyncCheckinJobData {
  checkins: Array<{ id: string; timestamp: string }>;
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

  async process(job: Job<SyncCheckinJobData>): Promise<any> {
    const { checkins} = job.data;

    let success = 0;
    let alreadyCheckedIn = 0;
    let notFound = 0;

    for (const checkin of checkins) {
      try {

        // Dùng transaction để tránh race condition
        await this.dataSource.transaction(async (manager) => {
          const ticket = await manager.findOne(Ticket, {
            where: { id: checkin.id },
          });

          if (!ticket) {
            notFound++;
            return;
          }

          if (ticket.status === TicketStatus.VALID) {
            ticket.status = TicketStatus.USED;
            ticket.updatedAt = new Date(checkin.timestamp);  
            await manager.save(ticket);
            success++;
          } else {
            alreadyCheckedIn++;
          }
        });
      } catch (error) {
        this.logger.error(`❌ Failed to sync ${checkin.id}:`, error);
      }
    }

    this.logger.info(
      `✅ Sync completed: success=${success}, already=${alreadyCheckedIn}, notFound=${notFound}`,
    );

    return { success, alreadyCheckedIn, notFound };
  }
}