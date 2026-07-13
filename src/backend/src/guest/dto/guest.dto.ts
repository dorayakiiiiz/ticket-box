import { IsIn, IsOptional, IsString, IsInt, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';


export class GetAdminGuestsQueryDto {
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
  @IsString()
  search?: string = '';
}

export class AdminCreateGuestDto {
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  concertId: string;
}

export class AdminUpdateGuestDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  isCheckedIn?: boolean;
}
