import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '../../entities/user.entity';

// Trích xuất user từ JWT payload đã được JwtAuthGuard xác thực
// Dùng thay cho (req as any).user?.id — type-safe hơn
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as User;
  },
);
