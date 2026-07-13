import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { INotificationChannel, RecipientInfo } from '../interfaces/notification.interface';

@Injectable()
export class ZaloChannel implements INotificationChannel {
  constructor(
    @InjectPinoLogger(ZaloChannel.name)
    private readonly logger: PinoLogger,
  ) {}

  async send(recipient: RecipientInfo, templateId: string, data: any): Promise<boolean> {
    if (!recipient.phone && !recipient.zaloId) {
      this.logger.error('No phone or zaloId provided for Zalo OA');
      return false;
    }

    // Zalo ZNS API expects a templateId and a payload matching the template's parameters
    const payload = {
      phone: recipient.phone,
      zalo_id: recipient.zaloId,
      template_id: templateId, // E.g., '123456' configured on Zalo OA Dashboard
      template_data: data,
    };

    // Todo: Integrate with Zalo ZNS API via HTTP Request
    // const response = await axios.post('https://openapi.zalo.me/v2.0/oa/message', payload, { headers });

    this.logger.info(`[ZALO MOCK] Sent ZNS to ${recipient.phone || recipient.zaloId} with template ${templateId} and data ${JSON.stringify(data)}`);
    return true;
  }
}
