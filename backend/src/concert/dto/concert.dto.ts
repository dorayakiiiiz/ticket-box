import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ConcertStatus } from '../../entities/concert.entity';

export class CreateConcertDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên concert không được để trống' })
  name: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'Địa điểm không được để trống' })
  venue: string;

  @IsString()
  @IsNotEmpty({ message: 'Thành phố không được để trống' })
  city: string;

  @IsDateString({}, { message: 'Ngày diễn không hợp lệ' })
  date: string;

  @IsString()
  @IsOptional()
  coverImageUrl?: string;
}

export class UpdateConcertDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @IsEnum(ConcertStatus)
  @IsOptional()
  status?: ConcertStatus;

  // Cho phép admin nhập tay tiểu sử nghệ sĩ qua modal (không qua PDF/AI pipeline)
  @IsString()
  @IsOptional()
  aiBio?: string;
}
