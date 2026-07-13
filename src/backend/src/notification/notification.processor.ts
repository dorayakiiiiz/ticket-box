import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ChannelType, NotificationFactory } from './notification.factory';
import { RecipientInfo } from './interfaces/notification.interface';

export interface NotificationJobData {
  channel: ChannelType;
  recipient: RecipientInfo;
  templateId: 'send-otp' | 'send-ticket' | 'send-reminder' | 'forgot-password';
  data: any;
}

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(NotificationProcessor.name)
    private readonly logger: PinoLogger,
    private readonly notificationFactory: NotificationFactory,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<any> {
    const { channel, recipient, templateId, data } = job.data;
    
    this.logger.info(`Processing notification job ${job.id} of type ${templateId} via ${channel}`);
    
    try {
      const channelHandler = this.notificationFactory.getChannel(channel);
      await channelHandler.send(recipient, templateId, data);
      
      this.logger.info(`Successfully sent ${templateId} notification via ${channel}`);
    } catch (error) {
      this.logger.error({ err: error }, `Failed to send ${templateId} notification via ${channel}`);
      throw error; // Re-throw to trigger BullMQ auto-retry
    }
  }
}
