import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Token dùng để inject Redis client vào các service
export const REDIS_CLIENT = 'REDIS_CLIENT';

// Custom NestJS provider — tạo ioredis instance từ env config
// Dùng ioredis trực tiếp thay vì @nestjs/cache-manager để hỗ trợ
// DECR/INCRBY atomic cần thiết cho Phase 3 (booking concurrency)
export const RedisProvider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService): Redis => {
    return new Redis({
      host: configService.get<string>('REDIS_HOST'),
      port: configService.get<number>('REDIS_PORT'),
      password: configService.get<string>('REDIS_PASSWORD'),
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  },
  inject: [ConfigService],
};
