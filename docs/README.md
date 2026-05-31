# TicketBox 🎫

TicketBox là một hệ thống bán vé sự kiện toàn diện, được thiết kế chuyên biệt để xử lý các bài toán tải trọng cao và đảm bảo tính công bằng trong việc phân phối vé. Hệ thống bao gồm Web App cho khán giả mua vé, Admin Dashboard cho ban tổ chức và Mobile App để soát vé tại sự kiện.

## 🚀 Key Technical Features

Dự án này tập trung giải quyết những "nút thắt" hóc búa nhất của một hệ thống bán vé thực tế:
- **Chống Tranh Chấp Vé (Race Condition):** Giải quyết bài toán hàng ngàn người giành nhau số lượng vé giới hạn cùng một thời điểm bằng **Redis Lua Script** và xử lý bất đồng bộ bằng **BullMQ**, đảm bảo tuyệt đối không bán lố vé (Oversell) mà không làm nghẽn Database.
- **Tối Ưu Tải Trọng Trang Chủ:** Áp dụng cơ chế **Next.js ISR (Incremental Static Regeneration)** kết hợp **Redis Caching**, giúp hệ thống chịu được lượng truy cập đột biến (Spike Load) lên tới hàng chục nghìn lượt/giây mà Server vẫn an toàn.
- **Thanh Toán An Toàn & Đối Soát:** Tích hợp **VNPAY Sandbox** với cơ chế **Webhook (IPN)**. Bọc **Circuit Breaker** để bảo vệ hệ thống khi cổng thanh toán sập, và có hệ thống Cronjob tự động hoàn vé nếu người dùng giữ vé mà không thanh toán.
- **Soát Vé Offline (Offline-First):** Nhờ việc dùng ứng dụng **Flutter** kết hợp cơ sở dữ liệu nội bộ **SQLite (sqflite)**, nhân sự soát vé ở khu vực đông người mất sóng (Sân vận động) vẫn có thể quét mã QR bình thường. Dữ liệu sẽ tự động đồng bộ (Background Sync) khi có mạng trở lại.
- **Tự Động Hóa Bằng AI:** Ban tổ chức chỉ cần nạp file PDF (Press kit), hệ thống sử dụng **Google Gemini AI** thông qua Background Worker để tự động tóm tắt tiểu sử nghệ sĩ một cách nhanh chóng.
- **Xử Lý Dữ Liệu Lớn (CSV Streaming):** Dùng kỹ thuật luồng (Stream) và Bulk Upsert để nạp mảng khách mời khổng lồ từ file CSV mà không gây ra lỗi tràn RAM (OOM).

---

## 🛠 Tech Stack

- **Backend:** NestJS, TypeORM, PostgreSQL, Redis, BullMQ.
- **Frontend (Web):** Next.js (App Router), Tailwind CSS, SWR/Axios.
- **Frontend (Mobile):** Flutter, sqflite, dio.
- **Khác:** Google Gemini API (AI), VNPAY Sandbox (Payment Gateway).

---

## ⚙️ Hướng Dẫn Cài Đặt & Chạy Môi Trường Local

Dưới đây là các bước để chạy toàn bộ hệ thống (Web + Backend) ở môi trường máy tính cá nhân. (Ứng dụng Mobile Flutter sẽ có README riêng trong tương lai).

### 1. Cài Đặt Backend (NestJS)
Mở Terminal 1 và trỏ vào thư mục backend:
```bash
cd backend
npm install
```
Sau đó, tạo file `.env` ở thư mục `backend` với các thông số mẫu sau (Vui lòng thay thế bằng thông tin Database, Redis thực tế của bạn):
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
Mở Terminal 2 và trỏ vào thư mục frontend:
```bash
cd frontend
npm install
```
Tạo file `.env.local` ở thư mục `frontend`:
```env
# Thay thế bằng URL Backend của bạn đang chạy
NEXT_PUBLIC_API_URL=http://localhost:3001 
```
Chạy Frontend:
```bash
npm run dev
```
Trang web sẽ chạy tại: `http://localhost:3000`. Bạn có thể mở trình duyệt để bắt đầu trải nghiệm.

---
*Tài liệu phân tích kiến trúc chuyên sâu, giải pháp từng nút thắt và phân rã task lập trình được chia làm 4 file riêng biệt trong dự án:*
- `phase2_core_data_ui.md`
- `phase3_concurrency_booking.md`
- `phase4_payment_webhook.md`
- `phase5_offline_checkin.md`
