import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { INotificationChannel, RecipientInfo } from '../interfaces/notification.interface';
import { IMailStrategy } from '../strategies/email/mail-strategy.interface';
import { BrevoStrategy } from '../strategies/email/brevo.strategy';
import { NodemailerStrategy } from '../strategies/email/nodemailer.strategy';

@Injectable()
export class EmailChannel implements INotificationChannel, OnModuleInit {
  private strategy: IMailStrategy;

  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(EmailChannel.name)
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
        this.logger.info('EmailChannel initialized with Brevo Strategy');
      }
    } else {
      this.initNodemailer();
    }
  }

  private initNodemailer() {
    const user = this.configService.get<string>('EMAIL_USER') || '';
    const pass = this.configService.get<string>('EMAIL_PASS') || '';
    this.strategy = new NodemailerStrategy(user, pass, this.logger);
    this.logger.info('EmailChannel initialized with Nodemailer Strategy');
  }

  private buildTemplate(templateId: string, data: any): { subject: string; html: string } {
    switch (templateId) {
      case 'send-otp':
        return {
          subject: 'Mã xác nhận đăng ký TicketZ',
          html: `<b>Mã OTP của bạn là: <span style="font-size:24px; color:#CCFF00; background:#000; padding:4px 8px;">${data.otpCode}</span></b>. Mã có hiệu lực trong 5 phút.`,
        };
      case 'forgot-password':
        return {
          subject: 'Khôi phục mật khẩu TicketZ',
          html: `<b>Mã OTP khôi phục mật khẩu của bạn là: <span style="font-size:24px; color:#CCFF00; background:#000; padding:4px 8px;">${data.otpCode}</span></b>. Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
        };
      case 'send-ticket': {
        const ticketListHtml = data.tickets.map((t: any) => {
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(t.qrCode)}`;
          
          let color = "#38BDF8";
          const zone = (data.ticketTypeName || "").toLowerCase();
          if (zone.includes("svip")) color = "#FF2D20";
          else if (zone.includes("vip")) color = "#C084FC";
          else if (zone.includes("sky")) color = "#CCFF00";
          
          let dateStr = "Đang cập nhật";
          let timeStr = "19:00";
          if (data.concertDate) {
            try {
              const dObj = new Date(data.concertDate);
              if (!isNaN(dObj.getTime())) {
                dateStr = dObj.toLocaleDateString("vi-VN");
                timeStr = dObj.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
              }
            } catch (e) {}
          }

          return `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #111111; border: 1px solid #333333; border-left: 4px solid ${color}; margin-bottom: 24px; border-radius: 0; border-collapse: collapse; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
              <tr>
                <!-- Left side: Info -->
                <td style="padding: 20px; vertical-align: top; width: 70%; border-right: 1px dashed #444444;">
                  <!-- Concert Name -->
                  <h3 style="color: #ffffff; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.5px; margin: 0 0 16px 0; line-height: 1.2;">
                    ${data.concertName}
                  </h3>
                  
                  <!-- Details Grid -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                    <tr>
                      <td width="50%" style="padding-bottom: 12px;">
                        <div style="color: #666666; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;">Ngày</div>
                        <div style="color: #ffffff; font-size: 13px; font-weight: bold;">${dateStr}</div>
                      </td>
                      <td width="50%" style="padding-bottom: 12px;">
                        <div style="color: #666666; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;">Giờ</div>
                        <div style="color: #ffffff; font-size: 13px; font-weight: bold;">${timeStr}</div>
                      </td>
                    </tr>
                    <tr>
                      <td width="50%" style="padding-bottom: 12px;">
                        <div style="color: #666666; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;">Địa điểm</div>
                        <div style="color: #ffffff; font-size: 13px; font-weight: bold;">${data.venue}</div>
                      </td>
                      <td width="50%" style="padding-bottom: 12px;">
                        <div style="color: #666666; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;">Thành phố</div>
                        <div style="color: #ffffff; font-size: 13px; font-weight: bold;">${data.city}</div>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Bottom row: Zone and Price -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #333333;">
                    <tr>
                      <td width="50%" style="padding-top: 16px;">
                        <div style="color: #666666; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;">Khu vực</div>
                        <div style="color: ${color}; font-size: 13px; font-weight: bold; text-transform: uppercase;">${data.ticketTypeName}</div>
                      </td>
                      <td width="50%" style="padding-top: 16px;">
                        <div style="color: #666666; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;">Giá vé</div>
                        <div style="color: #ffffff; font-size: 13px; font-weight: bold;">${Number(data.ticketPrice).toLocaleString('vi-VN')}đ</div>
                      </td>
                    </tr>
                  </table>
                  
                </td>
                <!-- Right side: QR Code -->
                <td width="30%" align="center" style="padding: 20px; vertical-align: middle; background-color: #111111;">
                  <div style="background-color: #ffffff; padding: 8px; display: inline-block;">
                    <img src="${qrUrl}" alt="QR Code" width="100" height="100" style="display: block; border: 0;" />
                  </div>
                  <div style="color: #666666; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px;">QUÉT QR</div>
                </td>
              </tr>
            </table>
          `;
        }).join('');

        const htmlContent = `
          <div style="background-color: #000000; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px 20px; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto;">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #CCFF00; font-size: 36px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 4px; font-style: italic;">TicketZ</h1>
                <div style="color: #888888; font-size: 14px; letter-spacing: 1px; margin-top: 8px;">E-TICKET DELIVERY</div>
              </div>

              <!-- Order Summary -->
              <div style="background-color: #111111; border: 1px solid #222222; padding: 24px; border-radius: 0; margin-bottom: 32px;">
                <h2 style="color: #ffffff; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Cảm ơn bạn đã mua vé!</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="color: #cccccc; font-size: 14px;">
                  <tr>
                    <td style="padding-bottom: 12px; width: 40%; color: #666666; text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: 1px;">Mã đơn hàng</td>
                    <td style="padding-bottom: 12px; font-weight: bold; color: #ffffff;">${data.orderCode}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 12px; color: #666666; text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: 1px;">Khách hàng</td>
                    <td style="padding-bottom: 12px; font-weight: bold; color: #ffffff;">${data.guestName}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: 1px;">Số lượng vé</td>
                    <td style="font-weight: bold; color: #CCFF00;">${data.quantity} vé</td>
                  </tr>
                </table>
              </div>

              <p style="color: #cccccc; font-size: 15px; margin-bottom: 24px; text-align: center;">Vui lòng lưu lại email này và xuất trình <strong>Mã QR</strong> tại khu vực kiểm soát vé để vào sự kiện.</p>

              <!-- Tickets -->
              ${ticketListHtml}

              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #222222; text-align: center;">
                <p style="color: #ff3333; font-size: 13px; margin: 0 0 8px 0; font-weight: bold;">QUY ĐỊNH</p>
                <p style="color: #666666; font-size: 12px; margin: 0 0 20px 0;">Tuyệt đối KHÔNG chia sẻ mã QR này hoặc đăng tải lên mạng xã hội để tránh bị kẻ gian đánh cắp vé.</p>
                <p style="color: #444444; font-size: 11px; margin: 0;">© 2026 TicketZ. All rights reserved.</p>
              </div>
            </div>
          </div>
        `;
        return {
          subject: `Vé điện tử của bạn - Đơn hàng ${data.orderCode}`,
          html: htmlContent,
        };
      }
      case 'send-reminder':
        return {
          subject: `[Nhắc nhở] Sự kiện ${data.concertName} sắp diễn ra!`,
          html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #333; background: #0a0a0a; color: #fff; padding: 20px;">
                <h1 style="color: #CCFF00; text-transform: uppercase;">TicketZ Reminder</h1>
                <p>Xin chào ${data.guestName},</p>
                <p>Sự kiện <b>${data.concertName}</b> sẽ diễn ra trong vòng chưa đầy 24 giờ nữa. Bạn đã chuẩn bị sẵn sàng chưa?</p>
                <p><b>Thời gian:</b> ${data.eventDate}</p>
                <p><b>Địa điểm:</b> ${data.venue}, ${data.city}</p>
                <p>Vui lòng chuẩn bị sẵn mã QR vé điện tử (trong email nhận vé hoặc lịch sử mua vé) để check-in tại sự kiện.</p>
                <br />
                <p>Hẹn gặp bạn tại đêm diễn!</p>
                <p style="color: #CCFF00;"><b>TicketZ Team</b></p>
              </div>
            `,
        };
      default:
        return {
          subject: 'Thông báo từ TicketZ',
          html: `<p>Nội dung thông báo: ${JSON.stringify(data)}</p>`,
        };
    }
  }

  async send(recipient: RecipientInfo, templateId: string, data: any): Promise<boolean> {
    if (!this.strategy) {
      this.logger.error('Mail strategy not initialized in EmailChannel');
      return false;
    }
    if (!recipient.email) {
      this.logger.error('No email provided in recipient info');
      return false;
    }

    const { subject, html } = this.buildTemplate(templateId, data);
    return this.strategy.sendMail(recipient.email, subject, html);
  }
}
