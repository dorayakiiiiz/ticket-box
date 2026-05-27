# Kế Hoạch Triển Khai & Danh Sách Công Việc (Tiến Độ 3 Tuần)

Tài liệu này trình bày toàn bộ stack công nghệ sử dụng và danh sách công việc chi tiết được chia theo từng bước thực hiện chung cho cả team trong thời hạn **3 tuần (21 ngày)**. Các công việc setup cơ bản được rút gọn để tập trung thời gian cho các luồng logic khó.

---

## 🛠 Tech Stack & Thư Viện Chuyên Dụng

### 1. Backend (API & Worker)
- **Framework:** NestJS (TypeScript) - Kiến trúc Modular Monolith.
- **Database:** PostgreSQL (Lưu trữ trên **Supabase**).
- **ORM:** TypeORM.
- **Cache & In-memory DB:** Redis (Lưu trữ trên **Redis Cloud** hoặc **Upstash**).
- **Redis Client:** `ioredis` (Kết nối và chạy Lua Script nguyên tử).
- **Message Broker / Queue:** `bullmq` (Chạy trên nền Redis qua `ioredis`).
- **Thư viện phụ trợ:** 
  - `@nestjs/jwt` & `passport-jwt` (Authentication).
  - `@nestjs/throttler` (Rate Limiting).
  - `opossum` (Circuit Breaker cho cổng thanh toán).
  - `csv-parser` (Đọc stream file CSV).
  - `pdf-parse` (Trích xuất text từ PDF).
  - `@google/genai` (Gọi API tóm tắt AI).

### 2. Frontend (Web)
- **Framework:** Next.js (App Router, ISR/SSR).
- **UI/Styling:** Tailwind CSS.
- **Data Fetching:** `axios` kết hợp SWR hoặc React Query để quản lý state và cache trên client.

### 3. Frontend (Mobile App Soát Vé)
- **Framework:** Flutter (Dart).
- **Local DB:** `sqflite` (Lưu danh sách vé offline).
- **Network:** `dio` (Giao tiếp API với NestJS).
- **QR Scanner:** `mobile_scanner` (Quét mã vé QR).

---

## 📌 Phase 1: Setup Hạ Tầng & Auth (Ngày 1 - Ngày 2)
*Mục tiêu: Hoàn tất khởi tạo môi trường, kết nối Database, cấu trúc folder và Authentication.*

- [ ] **Khởi tạo Database & Dịch vụ ngoài:**
  - Tạo project trên Supabase (Lấy URI kết nối Postgres).
  - Tạo project trên Redis Cloud (Lấy URI kết nối Redis).
  - Lấy API Key của Google Gemini và tạo tài khoản Sandbox VNPAY.
- [ ] **Setup NestJS Backend:**
  - Chạy `nest new backend`.
  - Cấu hình Prisma schema (`User`, `Concert`, `TicketType`, `Order`, `Ticket`, `Guest`) và chạy migration.
  - Setup kết nối `ioredis` và module `@nestjs/bullmq`.
- [ ] **Setup Next.js & Flutter:**
  - Khởi tạo Next.js App Router + Tailwind.
  - Khởi tạo Flutter project, setup routing cơ bản.
- [ ] **Tính năng Authentication (Base):**
  - NestJS: Viết API Login/Register, trả về JWT. Viết Role Guard (`@Roles('ADMIN', 'STAFF', 'AUDIENCE')`).
  - Next.js: Viết màn hình Login, lưu token vào HttpOnly Cookie hoặc LocalStorage, thiết lập Axios Interceptor.

---

## 📌 Phase 2: Core Data, Quản Trị & Giao Diện Public (Ngày 3 - Ngày 8)
*Mục tiêu: Dựng xong luồng tạo sự kiện, cấu hình vé, up tài liệu AI và hiển thị lên Web.*

- [ ] **API & Logic (NestJS):**
  - CRUD module `Concert` và `TicketType` (Thêm tên, địa điểm, ngày diễn, cấu hình giá, số lượng tổng, limit max vé/user).
  - API upload file PDF.
  - Tạo **Worker BullMQ (AI Job)**: Nhận event upload, dùng `pdf-parse` lấy text, gọi API Gemini, sau đó update trường `ai_bio` vào DB.
- [ ] **Admin Dashboard (Next.js):**
  - Màn hình danh sách Concert.
  - Form tạo/sửa Concert và thêm Ticket Types.
  - Component upload file PDF (Press kit).
- [ ] **Web Public (Next.js):**
  - Trang chủ (`/`): Load danh sách Concert sắp diễn (Áp dụng ISR `revalidate: 60` của Next.js).
  - Trang chi tiết Concert (`/concert/[id]`): Hiển thị thông tin, Bio từ AI, danh sách Ticket Type (lấy số lượng vé còn lại realtime bằng SWR).

---

## 📌 Phase 3: Nút Thắt - Đặt Vé & Hàng Đợi (Ngày 9 - Ngày 14)
*Mục tiêu: Xử lý bài toán hóc búa nhất: Chống tranh chấp vé (Race Condition) và Tải đột biến.*

- [ ] **Cấu hình Rate Limiting:**
  - Tích hợp `@nestjs/throttler` dùng custom Redis storage chặn spam request (vd: max 5 req/giây).
- [ ] **Chuẩn bị Dữ liệu (Redis):**
  - Admin publish Concert -> NestJS tự động cache số vé của mỗi `TicketType` vào Redis: `SET ticket:{id}:available 200`.
- [ ] **API Đặt Vé (Redis Lua Script & BullMQ):**
  - Viết script Lua nhận đầu vào: `userId`, `ticketTypeId`, `quantity`, `maxPerUser`.
  - Logic Lua (Atomic): Check limit user đã mua (`HGET user:{id}:tickets_held`), check available (`GET`). Đủ điều kiện -> Trừ available, cộng tickets_held -> Trả về SUCCESS.
  - NestJS gọi Lua qua `ioredis`. Nếu trả về SUCCESS -> Bắn message `ORDER_CREATED` vào **BullMQ**. API trả về ngay cho client "Đang xử lý tạo đơn".
- [ ] **Order Worker (NestJS):**
  - Consumer nhận message từ BullMQ, tiến hành ghi vào PostgreSQL: Tạo bản ghi `Order` (status `PENDING`) và các bản ghi `Ticket`.
- [ ] **Frontend Book Vé (Next.js):**
  - Giao diện chọn số lượng vé (hoặc sơ đồ chỗ).
  - Xử lý submit: Truyền kèm UUID làm **Idempotency-Key** để Backend chặn gửi đúp 2 lần request giống nhau.
  - Hiển thị màn hình Loading (Đang xếp hàng chờ xử lý).

---

## 📌 Phase 4: Thanh Toán VNPAY & Đối Soát (Ngày 15 - Ngày 17)
*Mục tiêu: Đảm bảo giao dịch an toàn, xử lý timeout và rớt mạng.*

- [ ] **API Thanh toán (NestJS):**
  - Viết module tích hợp VNPAY Sandbox (Tạo URL chuyển hướng).
  - Bọc API gọi sang hệ thống thanh toán bằng Circuit Breaker (`opossum`). Nếu VNPAY timeout liên tục -> Circuit "OPEN" -> Trả lỗi 503 để bảo vệ backend.
- [ ] **Xử lý Webhook (IPN):**
  - Viết API `POST /payment/webhook` cho VNPAY gọi về.
  - Nhận IPN, kiểm tra chữ ký (signature) hợp lệ -> Update DB status `Order` thành `PAID` hoặc `CANCELLED`.
  - Nếu `PAID`, trigger sự kiện sinh mã QR cho từng vé (Update payload QR vào cột `qr_code_payload`).
  - Nếu `CANCELLED`, gọi Redis hoàn trả số vé về `available` và trừ ở `tickets_held`.
- [ ] **Cronjob Hoàn Vé:**
  - Viết Job chạy 5 phút/lần: Quét đơn hàng `PENDING` đã quá 15 phút mà không có IPN về -> Tự động chuyển status Hủy và hoàn vé vào Redis.

---

## 📌 Phase 5: Mobile Offline Soát Vé & CSV Khách Mời (Ngày 18 - Ngày 21)
*Mục tiêu: Chốt sổ hệ thống bằng tính năng soát vé offline trên sân vận động.*

- [ ] **Guest List CSV (NestJS):**
  - API Upload file CSV cho Admin.
  - Dùng `csv-parser` xử lý stream từng dòng để không tràn RAM.
  - Áp dụng lệnh Insert `ON CONFLICT DO UPDATE` trong TypeORM/Prisma để đẩy nghìn dòng vào Postgres cực nhanh.
- [ ] **Backend Sync API (NestJS):**
  - API `GET /sync/tickets` -> Trả danh sách toàn bộ mã vé QR của 1 concert cho Staff.
  - API `POST /sync/checkins` -> Nhận mảng các vé đã quét offline từ Mobile đẩy lên. Lưu timestamp và check conflict (Last Write Wins).
- [ ] **Mobile App (Flutter):**
  - Màn hình đăng nhập Staff.
  - Màn hình chọn Concert -> Bấm "Tải dữ liệu Offline" -> Lưu toàn bộ vào DB cục bộ (`sqflite`).
  - Màn hình quét QR (dùng `mobile_scanner`). Quét mã -> Tìm trong `sqflite`. Hợp lệ -> Đổi status local thành CHECKED_IN. Đã quét -> Báo đỏ.
  - Viết logic kiểm tra kết nối mạng (`connectivity_plus`) -> Nếu có mạng, tự động gọi API đẩy các vé CHECKED_IN lên backend. 

---

## 🧪 Công Đoạn Cuối: Kiểm Thử
- **Postman/Insomnia:** Test full luồng mua vé, đổi mã lỗi VNPAY.
- **K6 / JMeter:** Load testing vào API mua vé. Gửi 500 request cùng lúc (kịch bản 500 user tranh 20 vé) để chứng minh script Redis Lua giữ dữ liệu nhất quán 100%, không bị oversell.
