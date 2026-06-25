# Account Settings — Walkthrough

## Tổng quan

Trang `/account-settings` ban đầu là **UI giả hoàn toàn** — 3/4 tính năng chính không gọi API nào cả. Session này implement đầy đủ backend + kết nối frontend thật.

---

## Hiện trạng trước khi làm

| Tính năng | Trạng thái ban đầu |
|-----------|-------------------|
| Xem thông tin (email, tên) | ✅ Thật — từ Zustand store |
| Đếm vé sắp diễn | ✅ Thật — gọi `ticketService.getMyTickets()` |
| Đăng xuất | ✅ Gọi `authService.logout()` nhưng **không redirect** |
| **Lưu thông tin cá nhân** | ❌ Fake — chỉ set `saved = true` |
| **Đổi mật khẩu** | ❌ Fake — không gọi API nào |
| **Xóa tài khoản** | ❌ Fake — chỉ gọi logout bình thường |

---

## Những file đã thay đổi

### Backend

#### `src/entities/user.entity.ts`
- Thêm `@DeleteDateColumn() deletedAt?: Date` — cho phép TypeORM soft delete
- Giữ nguyên các field `password?`, `fullName?`, `phone?` là `string?` (nullable: true)

#### `src/auth/dto/auth.dto.ts`
- Thêm `UpdateProfileDto` — validate `fullName?` và `phone?` (cả hai optional)
- Thêm `ChangePasswordDto` — validate `currentPassword` (required) và `newPassword` (min 6 ký tự)

#### `src/auth/auth.service.ts`
- Thêm `updateProfile(userId, fullName?, phone?)` — cập nhật name/phone, trả về user mới kèm `hasPassword`
- Thêm `changePassword(userId, currentPassword, newPassword)` — verify mật khẩu cũ bằng bcrypt, reject tài khoản OAuth, hash mới với 12 rounds
- Thêm `deleteAccount(userId)` — ẩn danh hoá email/name/phone/password, gọi `softDelete()`
- Thêm `hasPassword: !!user.password` vào **tất cả** response login/verifyOtp/supabaseLogin/updateProfile — để FE biết user có mật khẩu hay không

#### `src/auth/auth.controller.ts`
- Thêm `PATCH /auth/profile` — protected (không có `@Public`), lấy `userId` từ `req.user` do `JwtAuthGuard` inject
- Thêm `PATCH /auth/change-password` — protected
- Thêm `DELETE /auth/account` — protected, sau khi xóa clear cookie `token`

---

### Frontend

#### `src/stores/authStore.ts`
- Thêm `hasPassword?: boolean` vào `User` interface
- Thêm action `updateUser(partial: Partial<User>)` — merge partial vào state hiện tại rồi ghi lại cookie, không cần re-login

#### `src/services/authService.ts`
- Sửa `updateProfile` từ `POST` → `PATCH /auth/profile`
- Thêm `changePassword(currentPassword, newPassword)` → `PATCH /auth/change-password`
- Thêm `deleteAccount()` → `DELETE /auth/account`

#### `src/components/layout/Navbar.tsx`
- Thêm `router.push("/")` vào `handleLogout()` — trước đó logout xong không redirect

#### `src/app/account-settings/page.tsx`
- **Auth guard** — cùng pattern với `/admin/layout.tsx`: initialize store → kiểm tra `isAuthenticated` → redirect `/` nếu chưa login, hiện spinner chờ hydrate
- `ChangePasswordModal` — validate confirm match ở client, gọi API thật, hiện lỗi từ server
- `handleSave()` — gọi `authService.updateProfile()` + `updateUser()` store để sync ngay, hiện `saveError` nếu thất bại
- `handleDeleteAccount()` — gọi API xóa trước, rồi `logout()` + redirect `/`
- Xóa hardcode fallback `"Sỹ Văn"` → `""` để hiện tên thật
- Thêm `useEffect` sync `name`/`phone` state khi store hydrate xong (tránh hiện trống do `useState` chỉ chạy 1 lần lúc mount)
- Ẩn nút "Đổi mật khẩu" với tài khoản Google OAuth (`hasPassword === false`), thay bằng text giải thích

---

## Lỗi gặp phải và cách fix

### 1. `column User.isActive does not exist`

**Nguyên nhân**: Ban đầu thêm `isActive: boolean` vào entity nhưng `synchronize: true` của TypeORM chỉ chạy khi backend **khởi động lại**. Trong lần khởi động đầu sau khi thêm column, DB chưa có → runtime lỗi.

**Fix**: Bỏ `isActive` hoàn toàn. `deletedAt` từ `@DeleteDateColumn` đã đủ để xác định soft delete — TypeORM tự loại bỏ record có `deletedAt != null` khỏi mọi query thông thường.

---

### 2. `Type 'null' is not assignable to type 'string | undefined'`

**Nguyên nhân**: Entity khai báo `fullName?: string` (tức `string | undefined`), nhưng code trong `deleteAccount` gán `null` thẳng vào object entity.

**Fix**: Dùng `userRepo.update()` thay vì gán trực tiếp lên object:
```ts
await this.userRepo.update(userId, {
  fullName: null,
  phone: null,
  password: null,
  email: `deleted_${userId}@deleted.local`,
} as any);
```
`update()` gửi `SET NULL` trực tiếp xuống PostgreSQL mà không cần TypeScript type phải cho phép `null`.

---

### 3. `Data type "Object" in "User.password" is not supported by "postgres" database`

**Nguyên nhân**: Khi đổi type entity thành `string | null`, TypeORM không thể tự suy ra kiểu PostgreSQL từ union type — nó thấy "Object" thay vì "varchar".

**Fix**: Không dùng `string | null` trong entity. Giữ `string?` và dùng `userRepo.update()` với `as any` để bypass TypeScript khi cần set NULL.

---

### 4. Đăng xuất không redirect

**Nguyên nhân**: `handleLogout()` trong Navbar chỉ gọi `logout()` (clear store + cookie) nhưng không có `router.push()`.

**Fix**: Thêm `router.push("/")` sau `logout()` trong Navbar.

---

### 5. Tên hiển thị sai (hiện "Sỹ Văn" thay vì tên thật)

**Nguyên nhân**: Hardcode fallback `useState(user?.fullName || "Sỹ Văn")`.

**Fix**: Đổi thành `useState(user?.fullName || "")`.

---

### 6. Tên hiển thị trống dù store có dữ liệu

**Nguyên nhân**: `useState(user?.fullName || "")` chỉ đọc giá trị **một lần khi mount**. Khi component mount, store chưa kịp hydrate từ cookie → `user?.fullName = undefined` → `name = ""`. Sau đó store có dữ liệu nhưng state không tự update.

**Fix**: Thêm `useEffect` sync lại khi `user?.fullName` thay đổi:
```ts
useEffect(() => {
  if (user?.fullName) setName(user.fullName);
  if (user?.phone) setPhone(user.phone);
}, [user?.fullName, user?.phone]);
```

---

## Flow hoàn chỉnh của Account Settings

### Flow: Cập nhật thông tin cá nhân
```
User nhập tên/SĐT → bấm "Lưu thay đổi"
  → FE: authService.updateProfile(name, phone)
  → PATCH /auth/profile (kèm httpOnly cookie JWT)
  → JwtAuthGuard: verify cookie → inject req.user.id
  → AuthService.updateProfile(userId, fullName, phone)
  → userRepo.save(user)
  → Response: { message, user: { id, email, fullName, phone, role, hasPassword } }
  → FE: updateUser({ fullName, phone }) → merge vào Zustand store + ghi lại cookie
  → UI: hiện "✓ Đã lưu thay đổi" (2.2s)
```

### Flow: Đổi mật khẩu
```
User nhập mật khẩu cũ + mới + xác nhận → bấm "Cập nhật mật khẩu"
  → FE validate: newPassword === confirm? Nếu không → hiện lỗi ngay, không gọi API
  → FE: authService.changePassword(currentPassword, newPassword)
  → PATCH /auth/change-password
  → AuthService.changePassword(userId, currentPassword, newPassword)
  → Kiểm tra user.password có tồn tại không (OAuth users → reject)
  → bcrypt.compare(currentPassword, user.password) → sai → reject
  → bcrypt.hash(newPassword, 12) → userRepo.save()
  → FE: hiện ✓ thành công → đóng modal sau 1.6s
  [Nếu lỗi] → hiện message lỗi từ server trong modal
```

### Flow: Xóa tài khoản (Soft Delete)
```
User bấm "Xóa tài khoản" → nhập "XÓA TÀI KHOẢN" → confirm
  → FE: authService.deleteAccount()
  → DELETE /auth/account
  → AuthService.deleteAccount(userId)
  → userRepo.update(userId, { fullName: null, phone: null, password: null,
                               email: "deleted_{id}@deleted.local" })
  → userRepo.softDelete(userId) → set deletedAt = NOW()
  → Controller: clearCookie('token')
  → FE: authStore.logout() → xóa cookie 'user'
  → router.push("/") → về trang chủ

Kết quả trong DB:
  - Bản ghi VẪN CÒN (soft delete)
  - email/name/phone/password bị ẩn danh hoá
  - deletedAt có timestamp
  - Mọi Order/Ticket liên kết vẫn nguyên vẹn
  - TypeORM tự bỏ qua record này trong mọi find() thông thường
```

### Flow: Auth Guard (truy cập không có login)
```
User vào /account-settings không có cookie
  → Component mount → initialize() đọc cookie → không có user → isAuthenticated = false
  → ready = true && !isAuthenticated → router.replace('/')
  → Trong lúc chờ → hiện spinner "Đang kiểm tra đăng nhập..."
```

### Flow: Google OAuth — Đổi mật khẩu
```
User đăng nhập bằng Google → user.hasPassword = false (BE trả về)
  → FE lưu hasPassword vào cookie 'user'
  → Vào account-settings: kiểm tra user?.hasPassword !== false
  → Nút "Đổi mật khẩu" bị ẩn
  → Hiện text: "Tài khoản đăng nhập bằng Google — không dùng mật khẩu"
```

---

## Kiến trúc quyết định (ADR)

### Soft Delete thay vì Hard Delete

**Lý do**: User có thể có Orders/Tickets liên kết. Hard delete sẽ vi phạm FK constraint hoặc mất lịch sử giao dịch.

**Quyết định**: Soft delete (`@DeleteDateColumn`) + ẩn danh hoá thông tin nhạy cảm (`SET NULL` + đổi email).

**Trade-off**: Bản ghi vẫn chiếm storage, nhưng có thể khôi phục bằng `userRepo.restore(userId)` nếu cần.

### `userRepo.update()` thay vì `save()` để set NULL

**Lý do**: TypeORM `save()` bỏ qua các field `undefined` — không thể dùng để xóa dữ liệu. `update()` gửi đúng `SET NULL` xuống PostgreSQL.

### `hasPassword` flag thay vì check phía FE

**Lý do**: FE không biết user dùng OAuth hay không (không lưu provider trong cookie). Backend biết chắc khi `user.password === null`. Trả flag này trong response để FE render đúng UI.
