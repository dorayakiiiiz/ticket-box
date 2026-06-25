import { IsIn, IsOptional, IsString, IsInt, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';

// DTO validate query params cho GET /admin/dashboard?range=7d
export class GetDashboardQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d'], { message: 'range phải là "7d" hoặc "30d"' })
  range?: '7d' | '30d';
}

export class GetAdminOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsIn(['ALL', 'PAID', 'PENDING', 'CANCELLED', 'FAILED'])
  status?: string = 'ALL';

  @IsOptional()
  @IsString()
  search?: string = '';
}

export class GetAdminUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsIn(['ALL', 'STAFF', 'ORGANIZER', 'AUDIENCE'])
  role?: string = 'ALL';

  @IsOptional()
  @IsString()
  search?: string = '';
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsIn(['STAFF', 'ORGANIZER', 'AUDIENCE'])
  role?: string;
}

export class AdminChangePasswordDto {
  @IsString()
  @Length(6, 100, { message: 'Mật khẩu mới phải từ 6 đến 100 ký tự' })
  newPassword: string;
}

export class AdminCreateUserDto {
  @IsString()
  email: string;

  @IsString()
  @Length(6, 100, { message: 'Mật khẩu phải từ 6 đến 100 ký tự' })
  password: string;

  @IsString()
  fullName: string;

  @IsIn(['STAFF', 'ORGANIZER', 'AUDIENCE'])
  role: string;
}
