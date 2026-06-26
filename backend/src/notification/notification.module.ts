import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationProcessor } from './notification.processor';
import { NotificationFactory } from './notification.factory';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { ZaloChannel } from './channels/zalo.channel';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notification-queue' }),
  ],
  providers: [
    NotificationProcessor,
    NotificationFactory,
    EmailChannel,
    SmsChannel,
    ZaloChannel,
  ],
  exports: [BullModule, NotificationFactory],
})
export class NotificationModule {}
