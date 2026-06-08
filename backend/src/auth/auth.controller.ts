import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto, SupabaseLoginDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { Public } from 'src/common/guards/jwt.strategy';
import { CaptchaGuard } from 'src/common/guards/captcha.guard';

// Bật Throttler Guard cho toàn bộ AuthController
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // Giới hạn gắt gao: 3 requests / 1 phút (60000ms) để chống spam OTP rác
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Public()
  @UseGuards(CaptchaGuard)
  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body.email, body.password, body.fullName);
  }

  // Giới hạn xác minh OTP: 5 lần / 1 phút để chống Brute-force mã 6 số
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.email, body.code);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('supabase-login')
  @HttpCode(HttpStatus.OK)
  supabaseLogin(@Body() body: SupabaseLoginDto) {
    return this.authService.supabaseOAuthLogin(body.token);
  }

  // Chống Botnet spam email cấp lại mật khẩu (3 req / 1 phút)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Public()
  @UseGuards(CaptchaGuard)
  @Post('forgot-password')

  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.email, body.code, body.newPassword);
  }
}
