import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { JwtAuthGuard } from './common/guards/jwt.strategy';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConcertModule } from './concert/concert.module';
import { BookingModule } from './booking/booking.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { User } from './entities/user.entity';
import { Otp } from './entities/otp.entity';
import { Concert } from './entities/concert.entity';
import { TicketType } from './entities/ticket-type.entity';
import { Order } from './entities/order.entity';
import { Ticket } from './entities/ticket.entity';
import { Guest } from './entities/guest.entity';

@Module({
  imports: [
    // Pino logger — pino-pretty ở dev cho dễ đọc, JSON thuần ở production
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const isDev = config.get<string>('NODE_ENV') !== 'production';
        return {
          pinoHttp: {
            // Mức log tối thiểu: debug ở dev, info ở production
            level: isDev ? 'debug' : 'info',
            transport: isDev
              ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,        // mỗi log 1 dòng, dễ đọc hơn
                  translateTime: 'HH:MM:ss', // giờ local thay vì epoch
                  ignore: 'pid,hostname',  // bỏ bớt trường ít dùng
                },
              }
              : undefined, // production — JSON thuần để đẩy vào Datadog/Loki
            // Ghi đè serializer mặc định để request log gọn hơn
            serializers: {
              req: (req) => ({ method: req.method, url: req.url }),
              res: (res) => ({ statusCode: res.statusCode }),
            },
            // Không log route health check để giảm noise
            autoLogging: {
              ignore: (req) => req.url === '/health',
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [User, Otp, Concert, TicketType, Order, Ticket, Guest],
        synchronize: true, // Use only for dev/prototype
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get<string>('REDIS_HOST')}:${configService.get<number>('REDIS_PORT')}`,
        options: {
          password: configService.get<string>('REDIS_PASSWORD'),
          lazyConnect: false,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        },
      }),
      inject: [ConfigService],
    }),
    // Rate Limiting toàn cục — mỗi IP/user tối đa 10 req/giây mặc định
    // Sử dụng Redis để đồng bộ rate limit trên toàn bộ các server
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: 1000,
            limit: 10,
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get<string>('REDIS_HOST'),
            port: config.get<number>('REDIS_PORT'),
            password: config.get<string>('REDIS_PASSWORD'),
          })
        ),
      }),
    }),
    AuthModule,
    ConcertModule,
    BookingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard }
  ],
})
export class AppModule { }
