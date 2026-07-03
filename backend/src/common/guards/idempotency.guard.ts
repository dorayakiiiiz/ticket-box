import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      throw new HttpException(
        'Thiếu header Idempotency-Key',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Nếu key chưa tồn tại -> set + return true, nếu đã tồn tại -> return false
    const isNewRequest = await this.redisService.checkIdempotency(idempotencyKey);

    if (!isNewRequest) {
      throw new HttpException(
        'Yêu cầu trùng lặp — hệ thống đang xử lý request trước đó',
        HttpStatus.CONFLICT,
      );
    }

    return true;
  }
}
