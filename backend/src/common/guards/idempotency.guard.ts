import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * IdempotencyGuard — Guard chặn request trùng lặp (double-click, mạng lag retry)
 *
 * Flow:
 * 1. Đọc header 'Idempotency-Key' từ request
 * 2. Nếu thiếu header → 400 Bad Request
 * 3. Dùng Redis SET NX kiểm tra key:
 *    - Key mới → cho đi tiếp
 *    - Key đã tồn tại → 409 Conflict (request trùng lặp)
 *
 * FE sinh UUID mới mỗi lần user bấm "Mua vé", gắn vào header.
 * Nếu mạng lag user bấm 10 lần, chỉ request đầu tiên được xử lý.
 */
@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];

    // Validate: header bắt buộc phải có
    if (!idempotencyKey) {
      throw new HttpException(
        'Thiếu header Idempotency-Key',
        HttpStatus.BAD_REQUEST,
      );
    }

    // SET NX: nếu key chưa tồn tại → set + return true, nếu đã tồn tại → return false
    const isNewRequest = await this.redisService.checkIdempotency(idempotencyKey);

    if (!isNewRequest) {
      // Key đã tồn tại → user click đúp hoặc mạng retry
      throw new HttpException(
        'Yêu cầu trùng lặp — hệ thống đang xử lý request trước đó',
        HttpStatus.CONFLICT,
      );
    }

    return true;
  }
}
