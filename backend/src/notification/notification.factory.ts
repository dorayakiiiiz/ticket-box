import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { INotificationChannel } from './interfaces/notification.interface';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { ZaloChannel } from './channels/zalo.channel';

export enum ChannelType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  ZALO = 'ZALO',
}

@Injectable()
export class NotificationFactory {
  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly smsChannel: SmsChannel,
    private readonly zaloChannel: ZaloChannel,
  ) {}

  getChannel(type: ChannelType): INotificationChannel {
    switch (type) {
      case ChannelType.EMAIL:
        return this.emailChannel;
      case ChannelType.SMS:
        return this.smsChannel;
      case ChannelType.ZALO:
        return this.zaloChannel;
      default:
        throw new InternalServerErrorException(`Notification channel type ${type} is not supported`);
    }
  }
}
