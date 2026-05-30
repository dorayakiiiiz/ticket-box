# Giải thích chi tiết về Cơ chế Module, Service và Dependency Injection (DI) trong NestJS

Bài viết này sẽ giải thích nghiêm ngặt theo kỹ thuật code của NestJS để trả lời các câu hỏi của bạn về lỗi `UnknownDependenciesException` vừa rồi.

## 1. Phân biệt Module và Service trong NestJS

- **Service (`@Injectable()`)**: Là một class chứa logic code (ví dụ `AuthService`, `JwtService`). Service thực hiện công việc tính toán, chọc vào database, sinh token, v.v. Bạn không bao giờ tự gọi `new AuthService()` bằng tay, mà NestJS sẽ tự động tạo instance (khởi tạo class) giùm bạn thông qua cơ chế Dependency Injection (DI).
- **Module (`@Module()`)**: Là một "hộp chứa" (container) dùng để đóng gói code. NestJS quản lý phạm vi (scope) cực kỳ chặt chẽ. Một Module sẽ định nghĩa:
  - `controllers`: Các route nhận request.
  - `providers`: Các Service nằm **bên trong** hộp này.
  - `imports`: Mượn các "hộp" khác mang vào hộp này để xài.
  - `exports`: Xuất các Service hoặc Module từ trong hộp này ra ngoài để hộp khác xài.

**Nguyên tắc cốt lõi:** Một Service được khai báo trong `providers` của `Module A` thì **chỉ những class nằm trong Module A mới được quyền xài nó**. Nếu `Module B` muốn xài Service đó, `Module A` phải bỏ Service đó vào mảng `exports`, và `Module B` phải bỏ `Module A` vào mảng `imports`.

---

## 2. Trả lời: "Khi đăng ký `APP_GUARD` thì nó cố gắng tạo JwtAuthGuard là sao?"

Trong file `app.module.ts`, bạn viết:
```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard }
]
```
Đoạn code này nằm trong file `app.module.ts`, tức là nó thuộc phạm vi (scope) của `AppModule`.
Nó ra lệnh cho bộ máy IoC (Inversion of Control) của NestJS rằng: *"Hãy khởi tạo (new) class JwtAuthGuard và dùng nó làm Guard toàn cục"*.

Khi NestJS đọc lệnh này, nó nhảy vào file `jwt.strategy.ts` và nhìn vào constructor của `JwtAuthGuard`:
```typescript
constructor(private jwtService: JwtService, private reflector: Reflector, private config: ConfigService) {}
```
NestJS thấy: *"À, để tạo được JwtAuthGuard, tao cần truyền vào 3 instance: `JwtService`, `Reflector`, `ConfigService`"*.
Tiếp theo, NestJS lục tìm trong hộp `AppModule` xem có ai cung cấp (provide) `JwtService` không. Và kết quả là **Không tìm thấy**, dẫn đến lỗi `UnknownDependenciesException`.

---

## 3. Trả lời: "Trong class JwtAuthGuard đã có `import { JwtService }` rồi mà sao cần export ra nữa?"

Đây là sự khác biệt giữa **TypeScript (lúc viết code/compile)** và **NestJS DI (lúc chạy runtime)**.

Dòng chữ này ở đầu file:
```typescript
import { JwtService } from '@nestjs/jwt';
```
Đây thuần túy là lệnh của TypeScript/ES6. Nó chỉ mang tác dụng **khai báo Type** để code editor không báo lỗi đỏ, và để TypeScript biết `JwtService` có các hàm gì (vd: `verifyAsync`).
**Nó KHÔNG HỀ tạo ra một instance thực sự trên RAM (không có `new JwtService()`)**.

NestJS DI hoạt động ở lúc chạy (runtime). Ở lúc chạy, constructor của Guard cần một **đối tượng JwtService đã được khởi tạo và cấu hình (có chứa JWT_SECRET)**, chứ không phải cái vỏ type định nghĩa. Vì vậy, NestJS phải đi tìm cái instance đó trong hệ thống Module. Chỉ import bằng dòng chữ ở đầu file là hoàn toàn vô nghĩa đối với hệ thống DI của NestJS.

---

## 4. Trả lời: "Tại sao lại export JwtModule trong AuthModule mà không phải chỗ khác? Tại sao không export JwtService?"

Hãy nhìn lại file `auth.module.ts` của bạn lúc cấu hình JWT:
```typescript
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  // ...
})
export class AuthModule {}
```

**Tại sao cấu hình ở đây?**
Thư viện `@nestjs/jwt` cung cấp `JwtModule`. Khi bạn gọi `JwtModule.registerAsync(...)`, bạn đang thực hiện hành động: *"Khởi tạo một instance của JwtService và bơm vào đó cái khóa bí mật JWT_SECRET"*.
Vì luồng đăng nhập nằm ở `AuthModule`, nên theo thiết kế chuẩn, việc khởi tạo token và cấu hình secret key được viết nằm gọn trong `AuthModule` (trong mảng `imports` của `AuthModule`).

Lúc này, cái instance `JwtService` (đã có secret key) đang bị **nhốt kín** bên trong `AuthModule`. `AppModule` ở bên ngoài hoàn toàn mù tịt, không biết gì về cái `JwtService` đã được cấu hình này.

**Tại sao export JwtModule mà không phải JwtService?**
Thư viện `@nestjs/jwt` được viết dưới dạng Module. `JwtService` là một provider được nhúng chặt bên trong `JwtModule`.
Theo kiến trúc NestJS, khi bạn import một Dynamic Module (kiểu `Module.register(...)`), module đó sẽ sinh ra các provider ẩn bên trong nó. Để mang toàn bộ những thứ ẩn đó (bao gồm `JwtService`) ném ra ngoài cho thằng khác xài, bạn phải **export chính cái module đó**.

Khi bạn thêm dòng này vào `AuthModule`:
```typescript
exports: [AuthService, JwtModule]
```
Và do trong `app.module.ts` của bạn đã có sẵn:
```typescript
imports: [AuthModule]
```
Luồng dữ liệu sẽ đi như sau:
1. `AuthModule` sinh ra `JwtService` (đã có secret).
2. `AuthModule` ném `JwtModule` ra ngoài (exports).
3. `AppModule` nạp `AuthModule` vào (imports).
4. Do đó, `AppModule` được thừa hưởng cái `JwtModule` kia.
5. Lúc này, khi `AppModule` cố gắng tạo `JwtAuthGuard`, nó tìm `JwtService`. Nhờ được thừa hưởng từ bước 4, nó tìm thấy `JwtService` đã có sẵn secret. 
6. Dependency Injection thành công, lỗi biến mất.

## Tóm lược luồng kỹ thuật:

- **Lỗi xảy ra vì:** `AppModule` cố gắng khởi tạo `JwtAuthGuard` -> thiếu `JwtService` -> báo lỗi. Mặc dù `AuthModule` có `JwtService`, nhưng nó đóng kín cửa. Dòng `import { JwtService }` chỉ giải quyết vấn đề Type, không tạo ra memory instance.
- **Sửa lỗi bằng cách:** Mở cửa `AuthModule` bằng cách thêm `JwtModule` vào mảng `exports`. Nhờ `AppModule` đã `imports: [AuthModule]`, instance của `JwtService` được truyền từ `AuthModule` sang `AppModule` một cách hợp lệ trên bộ nhớ (runtime).
