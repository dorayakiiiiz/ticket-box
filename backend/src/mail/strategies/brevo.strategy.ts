import { IMailStrategy } from '../interfaces/mail-strategy.interface';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export class BrevoStrategy implements IMailStrategy {
  private apiInstance: any;

  constructor(
    private readonly apiKey: string,
    private readonly senderEmail: string,
    private readonly logger: PinoLogger,
  ) {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];
    apiKeyAuth.apiKey = this.apiKey;

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = html;
      sendSmtpEmail.sender = {
        name: 'TicketZ',
        email: this.senderEmail,
      };
      sendSmtpEmail.to = [{ email: to }];

      const data = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      this.logger.info(`Brevo: Email sent successfully to ${to}. Message ID: ${data.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(
        { err: error.response ? error.response.body : error },
        `Brevo: Failed to send email to ${to}`,
      );
      return false;
    }
  }
}
