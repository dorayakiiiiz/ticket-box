# Tái cấu trúc Upload Hình ảnh & Dọn rác Supabase Storage

Kế hoạch này nhằm mục đích tái cấu trúc luồng xử lý upload hình ảnh hiện tại, tách biệt logic kết nối Supabase Storage ra thành một module độc lập có thể tái sử dụng, đồng thời giải quyết vấn đề rác dữ liệu trên cloud (orphaned files) khi thay đổi hình ảnh.

## Lợi ích đạt được
1. **Dọn rác (Garbage Collection)**: Tự động xóa file cũ trên Supabase trước khi cập nhật URL file mới vào cơ sở dữ liệu.
2. **Khả năng tái sử dụng (Reusability)**: Bất kỳ module nào sau này (như User Avatar) đều có thể gọi `StorageService` để upload hoặc xóa file một cách dễ dàng.
3. **Mã nguồn sạch hơn (Clean Code)**: Gom chung các endpoint riêng lẻ thành một API endpoint duy nhất phân biệt qua param (Ví dụ: `?type=cover` hoặc `?type=seatMap`).

> [!WARNING]
> Kế hoạch này sẽ thay đổi cấu trúc API đang gọi từ Frontend. Quá trình làm cần đồng bộ sửa ở cả Backend và Frontend để không làm vỡ chức năng.

## Các thay đổi dự kiến

### Backend

#### [NEW] backend/src/storage/storage.module.ts
- Khởi tạo `StorageModule` để cung cấp `StorageService` cho toàn ứng dụng.
- Cần export `StorageService`.

#### [NEW] backend/src/storage/storage.service.ts
- Chứa logic tương tác với Supabase Storage.
- Tạo hàm `uploadImage(bucket: string, fileName: string, file: Express.Multer.File): Promise<string>`: Chuyển logic từ `ConcertService` sang đây.
- Tạo hàm `deleteImage(bucket: string, fileUrl: string): Promise<void>`: Phân tích `fileUrl` để lấy ra chính xác tên file (pathname) và gọi `supabase.storage.from(bucket).remove([fileName])`.

#### [MODIFY] backend/src/app.module.ts
- Import `StorageModule` vào hệ thống.

#### [MODIFY] backend/src/concert/concert.service.ts
- Xóa hàm private `uploadImageToSupabase` cũ.
- Tiêm (Inject) `StorageService` vào constructor.
- Thay thế 2 hàm `uploadSeatMap` và `uploadCoverImage` thành 1 hàm duy nhất `uploadImage(id: string, file: Express.Multer.File, type: 'cover' | 'seatMap', user: { id: string; role: UserRole })`.
- **Logic Garbage Collection**: Bên trong hàm này, trước khi lưu URL mới, lấy URL cũ ra từ DB (`concert.coverImageUrl` hoặc `concert.seatMapImageUrl`) và gọi `this.storageService.deleteImage(...)` để xóa file cũ đi.

#### [MODIFY] backend/src/concert/concert.controller.ts
- Hợp nhất `@Post(':id/upload-seat-map')` và `@Post(':id/upload-cover-image')` thành `@Post(':id/upload-image')`.
- Sử dụng `@Query('type')` để nhận biết Frontend đang muốn upload cho cột nào (`cover` hay `seatMap`).

### Frontend

#### [MODIFY] frontend/src/services/adminService.ts
- Gộp 2 hàm `uploadSeatMap` và `uploadCoverImage` thành:
  ```typescript
  uploadConcertImage: async (concertId: string, file: File, type: 'cover' | 'seatMap'): Promise<{ imageUrl: string }>
  ```
- Cập nhật URL endpoint gọi API thành `/concerts/${concertId}/upload-image?type=${type}`.

#### [MODIFY] frontend/src/components/admin/ConcertModal.tsx
- Cập nhật các hàm `handleCoverUpload` và `handleSeatMapUpload` để gọi `adminService.uploadConcertImage` với param `type` tương ứng.

## Kế hoạch Kiểm tra (Verification Plan)
- **Tái sử dụng**: Kiểm tra xem module mới có khởi động trơn tru cùng NestJS không.
- **Tính năng**: Thử upload ảnh Cover và Seat Map từ giao diện Admin.
- **Xóa rác (Garbage Collection)**:
  1. Upload một ảnh bìa A -> Kiểm tra DB đã cập nhật URL A.
  2. Xem Supabase Dashboard để đảm bảo ảnh A đã lên Storage.
  3. Upload đè ảnh bìa B -> Kiểm tra DB đã cập nhật URL B.
  4. **Quan trọng**: Truy cập Supabase Dashboard kiểm tra xem ảnh A đã hoàn toàn BỊ XÓA khỏi Storage hay chưa.
