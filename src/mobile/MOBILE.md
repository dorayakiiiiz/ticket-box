# MOBILE — Hướng dẫn cài đặt và sử dụng (Flutter)

Mục đích: hướng dẫn nhanh cách thiết lập môi trường, cài thư viện cần thiết từ `pubspec.yaml`, và các lệnh chạy/build.

**Yêu cầu môi trường**
- Flutter SDK: tương thích với `sdk: ^3.12.1` (cài Flutter >= 3.12). Kiểm tra: `flutter --version`.
- Dart (đi kèm với Flutter).
- Android:  Android Studio (hoặc command-line tools), một device/emulator.


**Các phụ thuộc chính (từ `pubspec.yaml`)**
- `cupertino_icons` — icon iOS.
- `sqflite` — SQLite local DB.
- `path_provider` — lấy đường dẫn lưu trữ cục bộ (documents, temp).
- `path` — xử lý đường dẫn file.
- `dio` — HTTP client mạnh, dùng cho requests.
- `provider` — state management nhẹ.
- `mobile_scanner` — scan QR / barcode.
- `connectivity_plus` — kiểm tra trạng thái mạng.
- `permission_handler` — quản lý quyền truy cập (camera, storage,...)

**Cài đặt nhanh các thư viện**
1. Cài Flutter SDK: theo hướng dẫn https://docs.flutter.dev/get-started/install
2. Trong thư mục `mobile/` chạy:

```bash
flutter pub get
```

3. (Android) Cài các Android tools nếu cần, mở Android Studio → SDK Manager → đảm bảo có `Android SDK Platform`, `Android SDK Build-Tools` tương thích.
4. (iOS macOS) Trong `mobile/` chạy:

```bash
cd ios
pod install
cd ..
```

**Chạy app (debug)**
- Kiểm tra thiết bị/emulator:

```bash
flutter devices
```

- Chạy trên thiết bị/emulator mặc định:

```bash
flutter run
```

- Chạy với flavor/release (Android):

```bash
flutter build apk --release
# hoặc chạy trên device
flutter install
```

**Xóa build cũ / làm sạch**

```bash
flutter clean
flutter pub get
```

**Lưu ý về quyền (camera / scan)**
- `mobile_scanner` yêu cầu quyền camera; sử dụng `permission_handler` để request quyền trước khi mở scanner.
- Trên Android, thêm permissions vào `android/app/src/main/AndroidManifest.xml` (ví dụ `CAMERA`, `INTERNET`).

**Lưu trữ cục bộ & DB**
- Dùng `sqflite` + `path_provider` để tạo/đọc DB trong thư mục documents.
- Xem `lib/` để tìm ví dụ khởi tạo DB (nếu đã có).

**Mẹo debug mạng / HTTP**
- `dio` hỗ trợ interceptors; bật logging trong development để xem request/response.
- Kiểm tra `connectivity_plus` trước khi gọi API để xử lý offline.

**Test**
- Chạy unit/widget tests:

```bash
flutter test
```

**CI / Build server**
- Trên CI: cài Flutter SDK, chạy `flutter pub get`, `flutter test`, `flutter build`.
- Đảm bảo biến môi trường cho Android keystore khi build release.
- Thực hiện `flutter pub get` để cài tất cả packages.
- Chạy `flutter run` và chọn thiết bị để chạy
- Nếu gặp lỗi permission hoặc build, kiểm tra `AndroidManifest.xml`, `Info.plist`, và phiên bản SDK phù hợp.

Nếu bạn muốn, tôi có thể:
- Tạo một checklist các bước chi tiết cho Android/iOS (và câu lệnh cụ thể để cài SDK trên Windows/macOS).
- Tạo ví dụ ngắn trong `lib/` minh họa `mobile_scanner` + `permission_handler` + `sqflite`.

**Cấu trúc `lib/` — giải thích chi tiết (app flow)**

- `lib/main.dart`: entry point của app. Flow chính:
	- gọi `DioClient().init()` để khởi tạo HTTP client.
	- (tuỳ chọn) `DatabaseHelper().resetDatabase()` được comment — dùng để xóa/seed DB khi cần.
	- khởi `NetworkSyncService` và `startBackgroundSync()` để đồng bộ background.
	- khởi `MultiProvider` với các `ChangeNotifierProvider` (ở project này có `AuthProvider`, `ConcertProvider`, `TicketProvider`).
	- `MyApp` kiểm tra `authProvider.isLoggedIn` → chuyển tới `ConcertSelectionScreen` khi đã đăng nhập hoặc `LoginScreen` khi chưa.

- `lib/models/`: các lớp dữ liệu (DTO / entity) dùng trong app (ví dụ `Concert`, `Ticket`, `User`).
- `lib/providers/`: state management (Provider). Ở đây bạn có:
	- `auth_provider.dart` — quản lý trạng thái đăng nhập, token, init() gọi khi app start.
	- `concert_provider.dart` — giữ danh sách concert, selection state.
	- `ticket_provider.dart` — giữ trạng thái vé, số lượng, thao tác booking tại client.

- `lib/services/`: logic kết nối/tiện ích nền tảng (network, DB, scanner helpers). Ví dụ file hiện có:
	- `dio_client.dart` — cấu hình `Dio` (base URL, interceptors).
	- `network_sync_service.dart` — chạy sync background.
	- (commented) `database_helper.dart` — thao tác `sqflite` nếu dùng local DB.

- `lib/screens/`: UI screens (màn hình)
- `lib/repositories/`: (nếu sử dụng) đóng gói truy cập dữ liệu (API calls) — thường được gọi từ `providers` hoặc `services`.
- `lib/utils/`: helpers chung, constants, formatters, validators.

Gợi ý kiến trúc ngắn:
- Provider (state) chịu nhiệm vụ cập nhật UI; gọi `repositories/services` để thao tác mạng/DB.
- `services/dio_client.dart` nên cung cấp instance `Dio` dùng chung (singleton) với cấu hình interceptors cho auth và logging.
- Background sync (`NetworkSyncService`) nên tách logic queue/ retry, tránh chạy nặng trong UI thread.

