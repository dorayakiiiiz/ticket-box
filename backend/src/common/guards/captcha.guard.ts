import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CaptchaGuard implements CanActivate {
  private readonly logger = new Logger(CaptchaGuard.name);

  constructor(private configService: ConfigService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // frontend có thể gửi token qua body hoặc header
    const token = request.body['cf-turnstile-response'] || request.headers['x-turnstile-token'];

    if (!token) {
      throw new ForbiddenException('Thiếu mã xác thực Captcha. Vui lòng xác minh bạn không phải là Bot.');
    }

    const secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY') || '1x0000000000000000000000000000000AA';

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);

      // gọi sang Cloudflare để verify token
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = await res.json();

      if (data.success) {
        return true; // Pass
      } else {
        this.logger.warn(`Captcha verification failed: ${JSON.stringify(data['error-codes'])}`);
        throw new ForbiddenException('Xác thực Captcha thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error('Error verifying Captcha with Cloudflare', error);
      throw new ForbiddenException('Hệ thống xác thực Captcha đang gặp sự cố. Vui lòng thử lại sau.');
    }
  }
}
