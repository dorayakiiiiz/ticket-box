import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { MailService } from './mail.service';

export interface MailJobData {
  type: 'send-otp' | 'send-ticket' | 'send-reminder';
  to: string;
  subject: string;
  html: string;
}

@Processor('mail-queue')
export class MailProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(MailProcessor.name)
    private readonly logger: PinoLogger,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<MailJobData>): Promise<any> {
    const { type, to, subject, html } = job.data;
    
    this.logger.info(`Processing mail job ${job.id} of type ${type} to ${to}`);
    
    try {
      await this.mailService.sendMail(to, subject, html);
      this.logger.info(`Successfully sent ${type} email to ${to}`);
    } catch (error) {
      this.logger.error({ err: error }, `Failed to send ${type} email to ${to}`);
      throw error; // Re-throw to trigger BullMQ auto-retry
    }
  }
}
