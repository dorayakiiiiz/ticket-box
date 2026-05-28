import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto, SupabaseLoginDto, VerifyOtpDto } from './dto/auth.dto';
import { Public } from 'src/common/guards/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body.email, body.password, body.fullName);
  }

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
}
