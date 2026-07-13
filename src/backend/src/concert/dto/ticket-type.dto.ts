import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsHexColor,
} from 'class-validator';

export class CreateTicketTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên loại vé không được để trống' })
  name: string;

  @IsNumber({}, { message: 'Giá phải là số' })
  @Min(0, { message: 'Giá không được âm' })
  price: number;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  totalQuantity: number;

  @IsInt({ message: 'Số vé tối đa phải là số nguyên' })
  @Min(1)
  @Max(10)
  maxPerUser: number;

  @IsString()
  @IsHexColor({ message: 'Mã màu phải là hex hợp lệ (vd: #CCFF00)' })
  colorCode: string;
}

export class UpdateTicketTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  // Nếu giảm xuống dưới soldQuantity → 400 Bad Request (kiểm tra trong Service)
  @IsInt()
  @Min(1)
  @IsOptional()
  totalQuantity?: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxPerUser?: number;

  @IsString()
  @IsHexColor()
  @IsOptional()
  colorCode?: string;

  // soldQuantity KHÔNG có ở đây — chỉ booking flow được chạm vào
}
