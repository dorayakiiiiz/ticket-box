# TicketBox

TicketBox là một hệ thống bán vé sự kiện toàn diện, được thiết kế chuyên biệt để xử lý các bài toán tải trọng cao và đảm bảo tính công bằng trong việc phân phối vé. Hệ thống bao gồm Web App cho khán giả mua vé, Admin Dashboard cho ban tổ chức và Mobile App để soát vé tại sự kiện.

**🚀 Live Demo:** [https://ticketboxzone.vercel.app](https://ticketboxzone.vercel.app)

## Key Technical Features

Dự án này tập trung giải quyết những "nút thắt" hóc búa nhất của một hệ thống bán vé thực tế:
- **Chống Tranh Chấp Vé (Race Condition):** Giải quyết bài toán hàng ngàn người giành nhau số lượng vé giới hạn cùng một thời điểm bằng **Redis Lua Script** và xử lý bất đồng bộ bằng **BullMQ**, đảm bảo tuyệt đối không bán lố vé (Oversell) mà không làm nghẽn Database.
- **Tối Ưu Tải Trọng Trang Chủ:** Áp dụng cơ chế **Next.js ISR (Incremental Static Regeneration)** kết hợp **Redis Caching**, giúp hệ thống chịu được lượng truy cập đột biến (Spike Load) lên tới hàng chục nghìn lượt/giây mà Server vẫn an toàn.
- **Thanh Toán An Toàn & Đối Soát:** Tích hợp **VNPAY Sandbox** với cơ chế **Webhook (IPN)**. Bọc **Circuit Breaker** để bảo vệ hệ thống khi cổng thanh toán sập, và có hệ thống Cronjob tự động hoàn vé nếu người dùng giữ vé mà không thanh toán.
- **Soát Vé Offline (Offline-First):** Nhờ việc dùng ứng dụng **Flutter** kết hợp cơ sở dữ liệu nội bộ **SQLite (sqflite)**, nhân sự soát vé ở khu vực đông người mất sóng (Sân vận động) vẫn có thể quét mã QR bình thường. Dữ liệu sẽ tự động đồng bộ (Background Sync) khi có mạng trở lại.
- **Tự Động Hóa Bằng AI:** Ban tổ chức chỉ cần nạp file PDF (Press kit), hệ thống sử dụng **Google Gemini AI** thông qua Background Worker để tự động tóm tắt tiểu sử nghệ sĩ một cách nhanh chóng.
- **Xử Lý Dữ Liệu Lớn (CSV Streaming):** Dùng kỹ thuật luồng (Stream) và Bulk Upsert để nạp mảng khách mời khổng lồ từ file CSV mà không gây ra lỗi tràn RAM (OOM).

---

## Tech Stack

- **Backend:** NestJS, TypeORM, PostgreSQL, Redis, BullMQ.
- **Frontend (Web):** Next.js (App Router), Tailwind CSS, SWR/Axios.
- **Frontend (Mobile):** Flutter, sqflite, dio.
- **Khác:** Google Gemini API (AI), VNPAY Sandbox (Payment Gateway).

---

## Hướng Dẫn Cài Đặt & Chạy Môi Trường Local

**LƯU Ý CHO NGƯỜI CHẤM:** 
Nếu clone code từ GitHub, dự án sẽ không bao gồm các file biến môi trường (`.env`). Vui lòng **lấy các file `.env` đã được cung cấp sẵn trên Google Drive** và đặt vào đúng thư mục (`src/backend/.env` và `src/frontend/.env.local`) để hệ thống kết nối đúng với Database và dịch vụ Cloud đã cấu hình sẵn.

Dưới đây là các bước để chạy toàn bộ hệ thống (Web + Backend) ở môi trường máy tính cá nhân.

### 1. Cài Đặt Backend (NestJS)
Mở Terminal 1 và trỏ vào thư mục `src/backend`:
```bash
cd src/backend
npm install
```
Sau đó, tạo file `.env` ở thư mục `src/backend` với các thông số mẫu sau (thay thế bằng thông tin Database, Redis thực tế):
```env
# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=123456
DB_NAME=ticketbox

# Redis & Queue
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_key

# Supabase Auth (Tùy chọn nếu muốn tích hợp luồng Auth qua OAuth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# VNPAY
VNPAY_TMNCODE=your_tmn_code
VNPAY_HASHSECRET=your_hash_secret

# Email (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```
Chạy Backend:
```bash
# Khởi động Backend (Port mặc định thường là 3000 hoặc 3001)
npm run start:dev
```

### 2. Cài Đặt Frontend (Next.js)
Mở Terminal 2 và trỏ vào thư mục `src/frontend`:
```bash
cd src/frontend
npm install
```
Tạo file `.env.local` ở thư mục `src/frontend`:
```env
# Thay thế bằng URL Backend của bạn đang chạy
NEXT_PUBLIC_API_URL=http://localhost:3001 
```
Chạy Frontend:
```bash
npm run dev
```
Trang web sẽ chạy tại: `http://localhost:3000`. Bạn có thể mở trình duyệt để bắt đầu trải nghiệm.

### 3. Cài Đặt App Mobile (Flutter)
Mở Terminal 3 và trỏ vào thư mục `src/mobile`:
```bash
cd src/mobile
# Cài đặt các package phụ thuộc
flutter pub get

# Chạy ứng dụng trên máy ảo hoặc thiết bị thật
flutter run
```
**Lưu ý:** Ứng dụng mobile được xây dựng bằng Flutter nên bạn cần đảm bảo đã cài đặt Flutter SDK và cấu hình thiết bị di động (Android Emulator hoặc iOS Simulator) thành công trên máy.

---

## Chạy Hệ Thống Bằng Docker

Thay vì cài đặt thủ công, bạn có thể chạy nhanh dịch vụ Backend và Frontend thông qua Docker. Hạ tầng Database (PostgreSQL, Redis) đã được deploy trên Cloud nên không cần cấu hình Docker cho DB. 

**Yêu cầu:** Máy tính đã cài đặt **Docker** và **Docker Compose**.

Mở Terminal tại thư mục `src` của dự án và chạy lệnh:
```bash
cd src
docker-compose up -d --build
```

**Các dịch vụ sẽ tự động khởi chạy:**
- **Frontend (Web):** [http://localhost:3000](http://localhost:3000)
- **Backend (API):** [http://localhost:8080](http://localhost:8080) (hoặc port được chỉ định trong `.env`)

---

## Hướng Dẫn Test Tính Năng Thanh Toán

**Lưu ý:** Tính năng thanh toán và đối soát vé tự động **chỉ được test trên bản deploy** ([https://ticketboxzone.vercel.app](https://ticketboxzone.vercel.app)). Ở môi trường local không có public IP nên các cổng thanh toán không thể gọi webhook (IPN) ngược về hệ thống để xác nhận giao dịch thành công.

Hệ thống hỗ trợ thanh toán qua **MoMo** và **VNPay**. Dưới đây là thông tin test dành cho giáo viên/người chấm:

### 1. Thanh toán qua MoMo
- Khi được chuyển hướng sang cổng thanh toán MoMo, bạn có thể nhập số tài khoản, điện thoại hoặc thông tin tài khoản bất kỳ hợp lệ để hoàn tất giao dịch.

### 2. Thanh toán qua VNPay
- Khi được chuyển hướng sang VNPay, vui lòng sử dụng thông tin thẻ test sau để giao dịch thành công:
  - **Ngân hàng:** NCB
  - **Số thẻ:** `9704198526191432198`
  - **Tên chủ thẻ:** `NGUYEN VAN A`
  - **Ngày phát hành:** `07/15`
  - **Mật khẩu OTP:** `123456`

Để dừng và tắt hệ thống, gõ lệnh:
```bash
docker-compose down
```
