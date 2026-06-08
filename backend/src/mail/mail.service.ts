import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IMailStrategy } from './interfaces/mail-strategy.interface';
import { NodemailerStrategy } from './strategies/nodemailer.strategy';
import { BrevoStrategy } from './strategies/brevo.strategy';

@Injectable()
export class MailService implements OnModuleInit, IMailStrategy {
  private strategy: IMailStrategy;

  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(MailService.name)
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit() {
    const provider = this.configService.get<string>('MAIL_PROVIDER', 'nodemailer').toLowerCase();

    if (provider === 'brevo') {
      const apiKey = this.configService.get<string>('BREVO_API_KEY');
      const senderEmail = this.configService.get<string>('EMAIL_USER');
      if (!apiKey) {
        this.logger.warn('Brevo strategy selected but BREVO_API_KEY is missing. Falling back to Nodemailer.');
        this.initNodemailer();
      } else {
        this.strategy = new BrevoStrategy(apiKey, senderEmail || 'travansy2305@gmail.com', this.logger);
        this.logger.info('MailService initialized with Brevo Strategy');
      }
    } else {
      this.initNodemailer();
    }
  }

  private initNodemailer() {
    const user = this.configService.get<string>('EMAIL_USER') || '';
    const pass = this.configService.get<string>('EMAIL_PASS') || '';
    this.strategy = new NodemailerStrategy(user, pass, this.logger);
    this.logger.info('MailService initialized with Nodemailer Strategy');
  }

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.strategy) {
      this.logger.error('Mail strategy not initialized');
      return false;
    }
    return this.strategy.sendMail(to, subject, html);
  }
}
