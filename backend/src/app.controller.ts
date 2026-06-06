import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/guards/jwt.strategy';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }
}
