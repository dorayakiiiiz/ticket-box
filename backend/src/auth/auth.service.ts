import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserRole } from '../entities/user.entity';
import { Otp } from '../entities/otp.entity';

@Injectable()
export class AuthService {
  private transporter;
  private supabase: SupabaseClient;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Otp) private otpRepo: Repository<Otp>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Cấu hình Nodemailer
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER') || '',
        pass: this.configService.get<string>('EMAIL_PASS') || '',
      },
    });

    // Cấu hình Supabase client để verify token nếu cần
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') || '',
      this.configService.get<string>('SUPABASE_ANON_KEY') || ''
    );
  }

  async signup(email: string, pass: string, fullName?: string) {
    let user = await this.userRepo.findOne({ where: { email } });
    if (user && user.isVerified) {
      throw new BadRequestException('Email đã được đăng ký!');
    }

    const hashed = await bcrypt.hash(pass, 10);
    if (!user) {
      user = this.userRepo.create({ email, password: hashed, fullName, isVerified: false });
      await this.userRepo.save(user);
    } else {
      user.password = hashed;
      user.fullName = fullName;
      await this.userRepo.save(user);
    }

    // Tạo mã OTP 6 số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const otp = this.otpRepo.create({ email, code: otpCode, expiresAt });
    await this.otpRepo.save(otp);

    // Gửi email
    await this.transporter.sendMail({
      from: `"TicketZ" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: email,
      subject: 'Mã xác nhận đăng ký TicketZ',
      html: `<b>Mã OTP của bạn là: <span style="font-size:24px; color:#CCFF00; background:#000; padding:4px 8px;">${otpCode}</span></b>. Mã có hiệu lực trong 5 phút.`,
    });

    return { message: 'OTP đã được gửi đến email của bạn.' };
  }

  async verifyOtp(email: string, code: string) {
    const otp = await this.otpRepo.findOne({ where: { email }, order: { createdAt: 'DESC' } });
    if (!otp || otp.code !== code) {
      throw new BadRequestException('Mã OTP không hợp lệ!');
    }
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('Mã OTP đã hết hạn!');
    }

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new BadRequestException('User not found');

    user.isVerified = true;
    await this.userRepo.save(user);
    await this.otpRepo.delete({ email });

    const token = this.jwtService.sign({ id: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, fullName: user.fullName } };
  }

  async login(email: string, pass: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.isVerified || !user.password) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc chưa xác thực!');
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Sai mật khẩu!');
    }

    const token = this.jwtService.sign({ id: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
  }

  async supabaseOAuthLogin(supabaseToken: string) {
    // Frontend gọi Supabase OAuth, lấy được session token và gửi lên Backend đây
    const { data: { user: sbUser }, error } = await this.supabase.auth.getUser(supabaseToken);
    if (error || !sbUser) {
      throw new UnauthorizedException('Token Supabase không hợp lệ!');
    }

    const email = sbUser.email;
    let user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      user = this.userRepo.create({
        email,
        isVerified: true,
        fullName: sbUser.user_metadata?.full_name || 'Khách',
      });
      await this.userRepo.save(user);
    }

    // Trả về JWT của hệ thống TicketBox
    const token = this.jwtService.sign({ id: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
  }
}
