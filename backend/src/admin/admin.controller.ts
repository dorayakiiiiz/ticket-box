import { Controller, Get, Patch, Delete, Body, Param, Query, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/entities/user.entity';
import { GetDashboardQueryDto, GetAdminOrdersQueryDto, GetAdminUsersQueryDto, AdminUpdateUserDto, AdminChangePasswordDto, AdminCreateUserDto } from './dto/admin.dto';

@Controller('admin')
@Roles(UserRole.ORGANIZER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard(@Query() query: GetDashboardQueryDto) {
    return this.adminService.getDashboard(query.range ?? '7d');
  }

  @Get('orders')
  getOrders(@Query() query: GetAdminOrdersQueryDto) {
    return this.adminService.getOrders(query);
  }

  @Post('users')
  createUser(@Body() body: AdminCreateUserDto) {
    return this.adminService.createUser(body);
  }

  @Get('users')
  getUsers(@Query() query: GetAdminUsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/stats')
  getUserStats() {
    return this.adminService.getUserStats();
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, body);
  }

  @Patch('users/:id/password')
  changeUserPassword(@Param('id') id: string, @Body() body: AdminChangePasswordDto) {
    return this.adminService.changeUserPassword(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
