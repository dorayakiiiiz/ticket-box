import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Tắt logger mặc định của NestJS, Pino sẽ thay thế sau khi app init
    bufferLogs: true,
  });

  // Dùng PinoLogger làm logger chính thức của toàn bộ NestJS
  // bufferLogs: true giữ các log bootstrap lại, flush sau khi Pino sẵn sàng
  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: process.env.CLIENT_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // [FIXED] Bật Graceful Shutdown.
  // Khi Docker hoặc Server gởi lệnh tắt (SIGTERM), NestJS sẽ không sập ngay lập tức.
  // Nó sẽ thông báo cho các module (như BullMQ Worker) ngưng nhận việc mới, 
  // hoàn thành nốt các job đang chạy dở rồi mới an toàn tắt nguồn.
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
