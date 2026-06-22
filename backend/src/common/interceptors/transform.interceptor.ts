import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Bọc tất cả response thành { success, data } theo api-conventions.md
// Chỉ áp dụng cho success response — error response vẫn qua AllExceptionsFilter
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { success: boolean; data: T }> {
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<{ success: boolean; data: T }> {
    return next.handle().pipe(
      map((data) => ({ success: true, data })),
    );
  }
}
