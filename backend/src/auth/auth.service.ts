import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { User } from '../entities/user.entity';
import { Otp } from '../entities/otp.entity';
import { MailService } from '../mail/mail.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Otp) private otpRepo: Repository<Otp>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectQueue('mail-queue') private mailQueue: Queue,
  ) {
    // Cấu hình Supabase client để verify token nếu cần
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') || '',
      this.configService.get<string>('SUPABASE_ANON_KEY') || ''
    );
  }

  async signup(email: string, pass: string, fullName?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    let user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (user && user.isVerified) {
      throw new BadRequestException('Email đã được đăng ký!');
    }

    const hashed = await bcrypt.hash(pass, 10);
    if (!user) {
      user = this.userRepo.create({ email: normalizedEmail, password: hashed, fullName, isVerified: false });
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

    const otp = this.otpRepo.create({ email: normalizedEmail, code: otpCode, expiresAt });
    await this.otpRepo.save(otp);

    // Gửi email qua Queue (Bất đồng bộ)
    await this.mailQueue.add('send-otp', {
      type: 'send-otp',
      to: normalizedEmail,
      subject: 'Mã xác nhận đăng ký TicketZ',
      html: `<b>Mã OTP của bạn là: <span style="font-size:24px; color:#CCFF00; background:#000; padding:4px 8px;">${otpCode}</span></b>. Mã có hiệu lực trong 5 phút.`,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    return { message: 'OTP đã được gửi đến email của bạn.' };
  }

  async verifyOtp(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const otp = await this.otpRepo.findOne({ where: { email: normalizedEmail }, order: { createdAt: 'DESC' } });
    if (!otp || otp.code !== code) {
      throw new BadRequestException('Mã OTP không hợp lệ!');
    }
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('Mã OTP đã hết hạn!');
    }

    const user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) throw new BadRequestException('User not found');

    user.isVerified = true;
    await this.userRepo.save(user);
    await this.otpRepo.delete({ email });

    const token = this.jwtService.sign({ id: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, fullName: user.fullName, hasPassword: !!user.password } };
  }

  async login(email: string, pass: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user || !user.isVerified || !user.password) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc chưa xác thực!');
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Sai mật khẩu!');
    }

    const token = this.jwtService.sign({ id: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, hasPassword: true } };
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
    return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, hasPassword: false } };
  }
  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      throw new BadRequestException('Email không tồn tại trong hệ thống!');
    }
    if (!user.password) {
      throw new BadRequestException('Tài khoản này được đăng nhập bằng Google. Vui lòng sử dụng tính năng Đăng nhập với Google.');
    }

    // Tạo mã OTP 6 số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const otp = this.otpRepo.create({ email: normalizedEmail, code: otpCode, expiresAt });
    await this.otpRepo.save(otp);

    // Gửi email qua Queue (Bất đồng bộ)
    await this.mailQueue.add('send-otp', {
      type: 'send-otp',
      to: normalizedEmail,
      subject: 'Khôi phục mật khẩu TicketZ',
      html: `<b>Mã OTP khôi phục mật khẩu của bạn là: <span style="font-size:24px; color:#CCFF00; background:#000; padding:4px 8px;">${otpCode}</span></b>. Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    return { message: 'OTP khôi phục mật khẩu đã được gửi đến email của bạn.' };
  }

  async resetPassword(email: string, code: string, newPassword?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!newPassword) {
      throw new BadRequestException('Vui lòng cung cấp mật khẩu mới!');
    }

    const otp = await this.otpRepo.findOne({ where: { email: normalizedEmail }, order: { createdAt: 'DESC' } });
    if (!otp || otp.code !== code) {
      throw new BadRequestException('Mã OTP không hợp lệ!');
    }
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('Mã OTP đã hết hạn!');
    }

    const user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) throw new BadRequestException('User not found');

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await this.userRepo.save(user);
    await this.otpRepo.delete({ email });

    return { message: 'Mật khẩu đã được khôi phục thành công. Vui lòng đăng nhập lại.' };
  }

  // Cập nhật họ tên và số điện thoại của user đang đăng nhập
  async updateProfile(userId: string, fullName?: string, phone?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Người dùng không tồn tại!');

    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    await this.userRepo.save(user);

    return {
      message: 'Cập nhật thông tin thành công.',
      user: { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role, hasPassword: !!user.password },
    };
  }

  // Đổi mật khẩu — kiểm tra mật khẩu hiện tại trước, không cho phép tài khoản OAuth
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Người dùng không tồn tại!');

    if (!user.password) {
      throw new BadRequestException('Tài khoản Google không sử dụng mật khẩu.');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng!');
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await this.userRepo.save(user);

    return { message: 'Đổi mật khẩu thành công.' };
  }

  // Soft delete: vô hiệu hoá tài khoản, giữ lại Order/Ticket lịch sử
  async deleteAccount(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Người dùng không tồn tại!');

    // Dùng update() để SET NULL trực tiếp trên DB — không cần gán null lên object entity
    await this.userRepo.update(userId, {
      fullName: null,
      phone: null,
      password: null,
      email: `deleted_${userId}@deleted.local`,
    } as any);
    await this.userRepo.softDelete(userId);

    return { message: 'Tài khoản đã được xoá.' };
  }
}
