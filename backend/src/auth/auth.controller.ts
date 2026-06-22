import { Controller, Post, Patch, Delete, Body, HttpCode, HttpStatus, UseGuards, Res } from '@nestjs/common';
import type { Response, Request } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto, SupabaseLoginDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto, ChangePasswordDto } from './dto/auth.dto';
import { Public } from 'src/common/guards/jwt.strategy';
import { CaptchaGuard } from 'src/common/guards/captcha.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { User } from 'src/entities/user.entity';

// Bật Throttler Guard cho toàn bộ AuthController
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // Giới hạn gắt gao: 5 requests / 1 phút (60000ms) để chống spam OTP rác
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @UseGuards(CaptchaGuard)
  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body.email, body.password, body.fullName);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyOtp(body.email, body.code);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', result.token, { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    return { user: result.user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.email, body.password);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', result.token, { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    return { user: result.user };
  }

  @Public()
  @Post('supabase-login')
  @HttpCode(HttpStatus.OK)
  async supabaseLogin(@Body() body: SupabaseLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.supabaseOAuthLogin(body.token);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', result.token, { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    return { user: result.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' });
    return { message: 'Đăng xuất thành công' };
  }

  // Chống Botnet spam email cấp lại mật khẩu (5 req / 1 phút)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  // Cập nhật thông tin cá nhân — yêu cầu JWT (không @Public)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(@CurrentUser() user: User, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, body.fullName, body.phone);
  }

  // Đổi mật khẩu — yêu cầu JWT
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: User, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  // Xoá tài khoản (soft delete) — yêu cầu JWT, clear cookie sau khi xoá
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.deleteAccount(user.id);
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' });
    return result;
  }
}
