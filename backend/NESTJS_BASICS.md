# Cẩm nang NestJS Cơ Bản Dành Cho Người Mới Bắt Đầu

Do bạn nhảy ngang vào làm dự án NestJS luôn nên việc bị "ngợp" bởi các khái niệm Module, Service, DI là cực kỳ bình thường.
Tài liệu này sẽ đi từ những khái niệm lập trình cơ bản nhất, giải thích theo hướng kỹ thuật nhưng dùng từ ngữ cực kỳ đơn giản để bạn dễ hình dung.

---

## 1. Bản thiết kế (Class) và Đồ vật thật (Instance)

Trước khi nói về NestJS, bạn phải nắm chắc cái này trong JavaScript/TypeScript:
- **Class (Lớp)**: Là một *bản thiết kế* nằm trên giấy.
- **Instance (Đối tượng)**: Là thứ được tạo ra từ bản thiết kế đó bằng từ khóa `new`. Thứ này tốn RAM, có thật và có thể chạy được.

Ví dụ:
```typescript
// Đây chỉ là tờ giấy vẽ cái ô tô (Class)
export class CarService {
  startEngine() {
    console.log("Brrr");
  }
}

// BẠN KHÔNG THỂ LÀM THẾ NÀY:
import { CarService } from './car.service';
CarService.startEngine(); // LỖI! Bản thiết kế trên giấy không thể nổ máy.

// BẠN BẮT BUỘC PHẢI LÀM THẾ NÀY:
const myCar = new CarService(); // Tạo ra 1 cái xe thật bằng lệnh 'new' (Instance)
myCar.startEngine(); // Xe thật thì mới nổ máy được
```

👉 **Nhớ kỹ:** Trong NestJS, dòng `import { JwtService } from '@nestjs/jwt'` chỉ là bạn đang lấy tờ giấy bản thiết kế mang về. Nó chưa phải là cái xe chạy được!

---

## 2. Vậy Dependency Injection (DI) là gì?

Ở các dự án bình thường (không dùng NestJS), bạn sẽ phải tự mình gọi chữ `new` khắp mọi nơi.
```typescript
// Chạy bằng cơm
const db = new Database();
const authService = new AuthService(db);
const authController = new AuthController(authService);
```
Càng làm lớn, bạn càng phải `new` rất mệt mỏi và dễ loạn.

**NestJS sinh ra DI (Dependency Injection) để làm osin cho bạn.**
Thay vì bạn tự gọi chữ `new`, bạn chỉ cần **đưa danh sách** những thứ bạn cần, NestJS sẽ tự động gọi `new` từ A-Z và nhét vào tay bạn.

**Cách NestJS làm:**
```typescript
// Bạn chỉ cần viết constructor thế này:
constructor(private authService: AuthService) {}
```
Khi app khởi động, NestJS sẽ đọc đoạn code trên và hiểu là: *"À, Controller này cần một cái xe AuthService thật. Để tao tự tìm cách `new AuthService()` rồi nhét vào cho nó xài, nó khỏi cần tự làm"*.

Cơ chế "NestJS tự động new và nhét vào constructor" chính là **Dependency Injection**.

---

## 3. Phân biệt Controller và Service

Để code không bị rác, NestJS bắt buộc chia làm 2 tầng:

- **Controller**: Người giao tiếp với khách. Chỉ quan tâm đến HTTP Request/Response (nhận link URL nào, body là gì, trả về mã 200 hay 400). Tuyệt đối không viết logic xử lý dữ liệu ở đây.
- **Service (`@Injectable()`):** Người làm việc nặng. Viết các logic lưu database, tính toán, kiểm tra mật khẩu ở đây.

*Luồng đi chuẩn: Khách gọi API -> Controller nhận request -> Controller nhờ Service làm hộ -> Service làm xong trả kết quả cho Controller -> Controller trả về cho khách.*

---

## 4. Module (`@Module`) là gì? Tại sao phải có Module?

Nếu code nhỏ, bạn quăng 100 cái Controller và Service vào 1 chỗ cũng được. Nhưng code lớn, NestJS bắt bạn gom chúng lại thành các khối gọi là **Module**.

Bạn hãy tưởng tượng **Module là một căn phòng có vách ngăn hoàn toàn cách ly với bên ngoài**.
Ví dụ ta có căn phòng `AuthModule`.

Bên trong căn phòng này sẽ khai báo:
- **`controllers: [AuthController]`**: Báo cho NestJS biết phòng này quản lý API nào.
- **`providers: [AuthService, JwtService]`**: Đây là **DANH SÁCH NHỮNG THỨ NESTJS ĐƯỢC PHÉP `NEW`** bên trong phòng này. Nhớ nhé, bạn phải liệt kê vào `providers` thì NestJS nó mới chịu làm osin gọi lệnh `new` cho bạn. Nếu quên liệt kê, nó sẽ báo lỗi `UnknownDependencies`.

---

## 5. Luật Import / Export của Module (Tường Rào)

Đây là chỗ bạn đang bị kẹt nhất. Quy tắc của NestJS cực kỳ nghiêm ngặt: **Đồ trong phòng nào thì chỉ người phòng đó mới được xài.**

Ví dụ: Bạn có `AuthModule` và `UserModule`.
- Trong `AuthModule` có `AuthService` (đã được khai báo trong providers).
- Thằng `UserController` (nằm ở UserModule) đột nhiên muốn xài `AuthService`.

Nếu bạn chỉ viết ở đầu file `UserController.ts` dòng `import { AuthService } ...` rồi nhét vào constructor, **NestJS SẼ BÁO LỖI NGAY**. Vì nó vi phạm luật vách ngăn!

**Làm sao để giải quyết? Bạn phải "đục lỗ" vách ngăn (Export / Import):**

**Bước 1: Phòng Auth phải mở cửa cho mang đồ ra ngoài (Export)**
```typescript
// auth.module.ts
@Module({
  providers: [AuthService], // Tạo ra đồ xài trong phòng
  exports: [AuthService],   // CHO PHÉP người ngoài được lấy đồ này xài
})
export class AuthModule {}
```

**Bước 2: Phòng User phải xin phép mượn đồ của phòng Auth (Import)**
```typescript
// user.module.ts
@Module({
  imports: [AuthModule], // Xin phép nối ống sang phòng Auth để mượn đồ
  providers: [UserService],
  controllers: [UserController]
})
export class UserModule {}
```

Chỉ sau khi làm xong 2 bước này, cái máy osin NestJS mới chịu lấy cái `AuthService` (xe thật) từ phòng Auth đem qua phòng User cho thằng `UserController` xài.

---

## 6. Tại sao Module thư viện (như JwtModule) lại khác?

Khi bạn cài một thư viện ngoài như `@nestjs/jwt`, người ta đã viết sẵn `JwtService` và gói gọn nó vào trong `JwtModule` rồi. Bạn không thể chui vào source code của họ mà sửa `exports: [JwtService]` được.

Khi bạn muốn dùng `JwtService` trong dự án của mình, nguyên tắc cũng không đổi:
- Bước 1: Phòng của bạn (`AuthModule`) phải `imports: [JwtModule]` (Mượn phòng Jwt).
- Lập tức, tất cả những đồ chơi (Service) mà phòng `JwtModule` đã export sẵn sẽ bay vào phòng `AuthModule` của bạn. Bạn được quyền xài `JwtService` thoải mái.

Nhưng nếu phòng `AppModule` ở tuốt bên ngoài cũng muốn xài `JwtService` thì sao?
`AppModule` không thể mượn trực tiếp từ `JwtModule` được (do cấu hình secret key nằm ở Auth). Nên nó phải đi đường vòng:
- `AuthModule` đang giữ `JwtModule`.
- `AuthModule` sẽ `exports: [JwtModule]` (truyền tay tiếp cái module đó ra ngoài).
- `AppModule` đi `imports: [AuthModule]`.
Lúc này, `AppModule` sẽ nhận được mọi thứ mà `AuthModule` có, bao gồm luôn cả phần được truyền tay là `JwtService`.

---
**Tóm lại các bước fix lỗi Dependency Injection (lỗi thiếu thư viện):**
1. Đọc log xem NestJS báo thiếu cái gì (vd báo thiếu JwtService).
2. Tự hỏi bản thân: "Cái JwtService này do Module nào tạo ra?"
3. Nếu do `AuthModule` tạo ra -> Kiểm tra xem `AuthModule` đã `exports` nó chưa?
4. Nếu mình đang code ở `UserModule` -> Kiểm tra xem `UserModule` đã `imports` thằng `AuthModule` chưa?
Đủ 2 vế (Một bên xuất, một bên nhập) thì sẽ hết lỗi!
