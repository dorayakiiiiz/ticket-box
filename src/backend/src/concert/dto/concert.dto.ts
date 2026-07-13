import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsInt, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsDateString({}, { message: 'Thời điểm mở bán không hợp lệ' })
  openTime: string;

  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @IsString()
  @IsOptional()
  seatMapImageUrl?: string;
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

  @IsDateString()
  @IsOptional()
  openTime?: string;

  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @IsString()
  @IsOptional()
  seatMapImageUrl?: string;

  @IsEnum(ConcertStatus)
  @IsOptional()
  status?: ConcertStatus;

}

// DTO validate query params cho GET /concerts
export class GetConcertsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(
    ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'],
    { message: 'status không hợp lệ' },
  )
  status?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
