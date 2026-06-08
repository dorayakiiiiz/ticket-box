import * as nodemailer from 'nodemailer';
import { IMailStrategy } from '../interfaces/mail-strategy.interface';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export class NodemailerStrategy implements IMailStrategy {
  private transporter;

  constructor(
    private readonly emailUser: string,
    private readonly emailPass: string,
    private readonly logger: PinoLogger,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.emailUser,
        pass: this.emailPass,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"TicketZ" <${this.emailUser}>`,
        to,
        subject,
        html,
      });
      this.logger.info(`Nodemailer: Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error({ err: error }, `Nodemailer: Failed to send email to ${to}`);
      return false;
    }
  }
}
