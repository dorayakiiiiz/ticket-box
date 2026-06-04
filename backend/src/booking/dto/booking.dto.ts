import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

/**
 * DTO cho POST /booking — validate input trước khi xử lý
 *
 * ticketTypeId: UUID loại vé (SVIP, VIP, GA, v.v.)
 * quantity: số vé muốn mua (tối thiểu 1, tối đa 10)
 */
export class CreateBookingDto {
  @IsString()
  @IsNotEmpty({ message: 'ticketTypeId không được để trống' })
  ticketTypeId: string;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(10, { message: 'Số lượng tối đa là 10' })
  quantity: number;
}
