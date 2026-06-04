import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * RedisModule — module bọc RedisService
 * Export RedisService để BookingModule và các module khác có thể inject
 *
 * Lưu ý: ioredis connection đã được đăng ký ở AppModule (RedisModule từ @nestjs-modules/ioredis)
 * Module này chỉ wrap thêm business logic (Lua Script, Idempotency, v.v.)
 */
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class TicketRedisModule {}
