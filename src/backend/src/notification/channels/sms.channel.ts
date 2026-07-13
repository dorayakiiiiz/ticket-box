import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { INotificationChannel, RecipientInfo } from '../interfaces/notification.interface';

@Injectable()
export class SmsChannel implements INotificationChannel {
  constructor(
    @InjectPinoLogger(SmsChannel.name)
    private readonly logger: PinoLogger,
  ) {}

  private buildMessage(templateId: string, data: any): string {
    switch (templateId) {
      case 'send-otp':
        return `TicketZ: Ma OTP cua ban la ${data.otpCode}. Hieu luc 5 phut.`;
      case 'send-ticket':
        return `TicketZ: Dat ve thanh cong! Su kien: ${data.concertName}, Ma don: ${data.orderId}. Vui long kiem tra app.`;
      case 'send-reminder':
        return `TicketZ: Su kien ${data.concertName} se dien ra vao luc ${data.eventDate}. Nho mang theo E-Ticket nhe!`;
      default:
        return `TicketZ: Thong bao - ${JSON.stringify(data)}`;
    }
  }

  async send(recipient: RecipientInfo, templateId: string, data: any): Promise<boolean> {
    if (!recipient.phone) {
      this.logger.error('No phone number provided for SMS');
      return false;
    }

    const message = this.buildMessage(templateId, data);
    
    // Todo: Integrate with real SMS gateway API like Twilio or Brevo SMS
    // const response = await this.twilioClient.messages.create({ ... });
    
    this.logger.info(`[SMS MOCK] Sent SMS to ${recipient.phone}: ${message}`);
    return true;
  }
}
