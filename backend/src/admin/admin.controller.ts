import { Controller, Get, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/entities/user.entity';
import { GetDashboardQueryDto } from './dto/admin.dto';

@Controller('admin')
@Roles(UserRole.ORGANIZER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard(@Query() query: GetDashboardQueryDto) {
    // Default về '7d' nếu không truyền — range đã được @IsIn validate
    return this.adminService.getDashboard(query.range ?? '7d');
  }
}
