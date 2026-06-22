import { IsIn, IsOptional } from 'class-validator';

// DTO validate query params cho GET /admin/dashboard?range=7d
export class GetDashboardQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d'], { message: 'range phải là "7d" hoặc "30d"' })
  range?: '7d' | '30d';
}
