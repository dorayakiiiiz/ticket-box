# TicketBox Blueprint — Kế Hoạch Triển Khai và Phân Công Đầy Đủ

> **⚠️ LƯU Ý QUAN TRỌNG CHO CÁC THÀNH VIÊN:**
> Mọi thứ trong kế hoạch này chỉ là **tham khảo định hướng**. Để viết tài liệu chính xác nhất, các bạn **bắt buộc phải đọc kỹ toàn bộ codebase** (`backend/`, `frontend/`, `mobile/`) và tham khảo format từ file đặc tả đã viết mẫu (`specs/auth.md`). Nội dung tài liệu phải phản ánh 100% logic code đang chạy thực tế, không bịa thêm tính năng không có trong code, format phải tương đồng với file mẫu.


## LƯU Ý: MỌI NGƯỜI RÁNG CHỜ CLAUDE ĐỂ VIẾT NHA, T VIẾT CÁI AUTH.MD BẰNG CLAUDE OKE VCL MÀ HẾT MẸ TOKEN NÊN PHẢI VIẾT QUA GEMINI, DCM NGU HƠN CHÓ NÊN T KO VIẾT NỮA. VỚI CÁI ĐẶC TẢ MẪU CŨNG DO CON GEMINI GEN RA Á NÓ ĐÉO ĐÚNG ĐÂU NÊN KỆ MẸ NÓ ĐI CỨ KÊU NÓ ĐỌC KĨ CODEBASE RỒI VIẾT CHO HỢP LÍ LÀ ĐƯỢC, GIỐNG CÁI FILE AUTH.MD Á KĨ CÀNG VÀO CÀNG KĨ CÀNG TỐT

## 1. Cấu Trúc Thư Mục Cần Hoàn Thiện

```
blueprint/
├── proposal.md                    ← Leader  (ĐÃ XONG)
├── design.md                      ← Leader        (ĐÃ XONG)
└── specs/
    ├── auth.md                    ← Leader  (ĐÃ XONG)
    ├── concert.md                 ← Thịnh
    ├── booking.md                 ← Thịnh
    ├── payment.md                 ← Đạt 
    ├── ticket.md                  ← Đạt 
    ├── notification.md            ← Leader 
    ├── checkin.md                 ← Duy
    └── csv-guest.md               ← Duy
```

---

## 2. Phân Công Nhiệm Vụ & Template Chi Tiết Từng File

Dưới đây là template chi tiết (skeleton) cho từng file. Cứ copy đoạn markdown vào file của mình và đắp thêm chữ/sơ đồ cho đúng thực tế codebase nhé.

### 👤 Thành Viên B — `specs/concert.md`

**File: `specs/concert.md`** (Dựa vào `concert.service.ts`, `ai-bio.processor.ts`, `ai-provider/`)

```markdown
# Đặc Tả: Quản Lý Concert và AI Bio

## Mô Tả
Tính năng cho phép Ban Tổ Chức (ORGANIZER) quản lý vòng đời concert, thiết lập các loại vé (TicketType), và tự động tóm tắt tiểu sử nghệ sĩ từ PDF Press Kit bằng công nghệ AI (Gemini/Groq).

## Luồng Chính
1. **Luồng Khởi Tạo Cache (Redis Warm-up):**
   - Khi server NestJS start (`onApplicationBootstrap`).
   - Query toàn bộ `TicketType` từ DB.
   - Dùng lệnh `SET NX` trên Redis để set số vé khả dụng (tránh ghi đè nếu data đang live).
2. **Luồng Cập Nhật AI Bio (Bất Đồng Bộ):**
   - ORGANIZER upload file PDF (giới hạn 10MB).
   - Backend đổi `aiStatus` thành `PROCESSING`, ném file dạng buffer vào BullMQ queue `ticketbox.concert.ai-bio`.
   - Worker nhận job, đẩy text sang Gemini/Groq API (Strategy Pattern).
   - Nhận kết quả, lưu DB, đổi `aiStatus` thành `DONE` hoặc `FAILED`.
3. **Luồng Client Polling AI Bio:**
   - FE (SWR) gọi GET status liên tục mỗi 3s cho đến khi nhận `DONE`.

## Kịch Bản Lỗi
- File upload không phải PDF hoặc > 10MB → Trả về HTTP 400.
- Lỗi kết nối Google Gemini/Groq → Worker retry 3 lần, nếu vẫn lỗi chuyển `aiStatus` thành `FAILED`.
- AUDIENCE cố tình gọi API tạo Concert → HTTP 403 Forbidden.

## Ràng Buộc
- **Hiệu năng:** API lấy số lượng vé khả dụng (`GET /concerts/:id/availability`) áp dụng `Cache-Control: public, s-maxage=5` để CDN/Vercel Edge hấp thụ tải.
- **Data:** Concert bị xóa dùng `Soft Delete` để không làm mất order lịch sử.

## Tiêu Chí Chấp Nhận
- [ ] Upload PDF hợp lệ, server xử lý ngầm và FE tự động hiện kết quả sau vài giây.
- [ ] Upload file > 10MB báo lỗi "File quá lớn".
- [ ] Số vé trên Redis đồng bộ với DB khi khởi động lại server.
```

---

### 👤 Thành Viên C — `specs/booking.md`, `specs/payment.md`, `specs/ticket.md`

**File 1: `specs/booking.md`** (Dựa vào `booking.controller.ts`, `booking.service.ts`, `redis/lua/book-ticket.lua`)

```markdown
# Đặc Tả: Luồng Đặt Vé Đồng Thời (Concurrency Booking)

## Mô Tả
Xử lý hàng chục nghìn người cùng tranh mua vé tại một thời điểm. Đảm bảo tuyệt đối không bán quá số lượng vé thực có (Overselling) và không cho 1 người mua quá giới hạn.

## Luồng Chính (5 Lớp Bảo Vệ)
1. **ThrottlerGuard (Redis-backed):** Giới hạn 3 request / 1 giây / user.
2. **CaptchaGuard:** Chặn bot qua Cloudflare Turnstile token.
3. **IdempotencyGuard:** Frontend gửi UUID intent. Backend dùng `SET NX idempotency:UUID` để chặn double-click.
4. **Redis Lua Script (Atomic):**
   - Chạy atomic trên Redis (đơn luồng).
   - Kiểm tra `tickets_held` + `quantity` <= `maxPerUser`.
   - Kiểm tra `available` >= `quantity`.
   - `DECRBY` available và `INCRBY` tickets_held.
5. **BullMQ Worker:** Đẩy job tạo Order (PENDING) vào `ticketbox.order`. Client polling mỗi 2 giây để nhận kết quả (State machine: idle → submitting → polling → success/error).

## Kịch Bản Lỗi
- `SOLD_OUT`: Lua script báo hết vé → HTTP 400.
- `LIMIT_EXCEEDED`: Mua quá giới hạn → HTTP 400.
- `Worker Lỗi DB`: Lỗi tạo đơn → Worker tự động gọi `rollbackBooking()` trên Redis trả lại vé → Job `FAILED` → FE báo lỗi.

## Ràng Buộc
- **Concurrency:** Bắt buộc trừ vé bằng Lua Script trên Redis, KHÔNG query database trong lúc giữ vé.
- **Idempotency:** UUID sinh từ sessionStorage trên Frontend.
```

**File 2: `specs/payment.md`** (Dựa vào `payment.factory.ts`, `payment/strategies`, `cron.service.ts`)

```markdown
# Đặc Tả: Thanh Toán và Webhook (IPN)

## Mô Tả
Tích hợp thanh toán VNPAY/MoMo và xử lý Webhook server-to-server, đi kèm cơ chế Circuit Breaker bảo vệ hệ thống khi cổng thanh toán sập.

## Luồng Chính
1. **Tạo URL Thanh Toán:** Gọi VNPAY/MoMo thông qua Circuit Breaker (opossum).
2. **Tiếp Nhận IPN Webhook (VNPAY/MoMo):**
   - Verify chữ ký HMAC (SHA512 với VNPAY, SHA256 với MoMo).
   - Bật Transaction: `SELECT * FROM orders FOR UPDATE` (Pessimistic Locking).
   - So khớp số tiền (`vnp_Amount`).
   - Đổi trạng thái Order thành `PAID` và sinh `Ticket`.
3. **Cronjob Dọn Dẹp (Mỗi 5 phút):**
   - Quét đơn PENDING > 15 phút.
   - Hủy đơn và hoàn vé về Redis.
   - Cờ `isRefundedToRedis` dùng cho cơ chế Self-Healing nếu Redis lỗi.

## Kịch Bản Lỗi
- VNPAY sập / timeout > 5s → Circuit Breaker chuyển `OPEN` → Trả ngay HTTP 503 để cứu server khỏi connection pool exhaust.
- Hacker sửa số tiền trên URL VNPAY → IPN check sai amount → Reject giao dịch, không nhả vé.
- VNPAY gọi IPN đúp 2 lần → Pessimistic Lock chặn request 2, check status đã PAID → bỏ qua (Idempotent).

## Ràng Buộc
- Bắt buộc dùng `SELECT FOR UPDATE` khi xử lý webhook.
```

**File 3: `specs/ticket.md`** (Dựa vào `ticket.controller.ts`, `ticket.entity.ts`)

```markdown
# Đặc Tả: Quản Lý Vé

## Mô Tả
Sinh và quản lý mã vé điện tử QR Code, API đồng bộ vé xuống máy quét soát vé.

## Luồng Chính
1. **Sinh vé:** Ngay sau khi Order `PAID`, hệ thống lặp vòng lặp sinh `N` vé dựa theo `quantity`. Mỗi vé có QR code là `uuidv4()`.
2. **Khán giả xem vé:** Gọi `GET /ticket/my-tickets` để hiển thị trên web.
3. **Staff tải vé:** Staff gọi `GET /ticket/download` để lấy cục data 40,000 vé về máy offline.
4. **Staff đồng bộ vé:** Gọi `POST /ticket/batch-sync` để đẩy lịch sử quét từ SQLite lên DB.

## Ràng Buộc
- QR code bắt buộc phải là chuỗi ngẫu nhiên (UUID), không được mang tính tuần tự (như ID 1, 2, 3) để tránh làm giả.
```

---

### 👤 Thành Viên D — `specs/checkin.md`, `specs/notification.md`, `specs/csv-guest.md`

**File 1: `specs/checkin.md`** (Dựa vào codebase `mobile/` Flutter và api batch-sync)

```markdown
# Đặc Tả: Soát Vé Offline

## Mô Tả
Tính năng kiểm soát vé tại cổng bằng Mobile App viết bằng Flutter, có khả năng hoạt động 100% không cần Internet.

## Luồng Chính
1. **Đồng bộ xuống (Online):** STAFF bấm nút tải, app gọi `/ticket/download`, ghi đè vào `SQLite`.
2. **Soát vé (Offline):** Camera quét QR → query SQLite bằng index. 
   - Không thấy → Vé giả (ĐỎ).
   - Trạng thái `CHECKED_IN` → Vé đã dùng (VÀNG).
   - Trạng thái `VALID` → Vé hợp lệ (XANH), update local thành `CHECKED_IN`, đưa vào `pending_sync_queue`.
3. **Đồng bộ lên (Auto-Sync):** Khi có mạng, app đẩy queue lên `/ticket/batch-sync`.
   - Backend chạy Transaction: `SELECT FOR UPDATE`.
   - Trạng thái trên DB vẫn là `VALID` → Cập nhật thành `USED`.
   - Trạng thái trên DB đã là `USED` (cổng khác đã sync trước) → Bỏ qua (Luật "First Sync Wins").

## Ràng Buộc
- Thời gian quét 1 vé offline phải dưới 0.1s.
- DB local bắt buộc đánh index trường `qrCode`.
```

**File 2: `specs/notification.md`** (Dựa vào `notification.processor.ts`, `notification.factory.ts`, `channels/`)

```markdown
# Đặc Tả: Hệ Thống Thông Báo Đa Kênh

## Mô Tả
Hệ thống gửi Email/SMS/Zalo bất đồng bộ qua BullMQ Queue, đi kèm Cronjob nhắc nhở sự kiện.

## Luồng Chính
1. **Gửi Email Transactional:**
   - App gọi `notificationQueue.add(...)`.
   - Worker nhận job, dùng `NotificationFactory` lấy đúng `EmailChannel` (Brevo API) để gửi.
2. **Cronjob Nhắc Nhở (Mỗi 30 phút):**
   - Query DB lấy các concert sắp diễn ra (trước 24h) và `isReminded = false`.
   - Cắm cờ Distributed Lock trên Redis (`SET NX cronjob:lock:sendEventReminders`) để đảm bảo nếu chạy 3 node NestJS thì chỉ 1 node được thực hiện gửi mail.
3. **Graceful Shutdown:** Khi tắt server, NestJS giữ tiến trình sống cho đến khi Worker xử lý xong cái email đang gửi dở.

## Kịch Bản Lỗi
- Brevo API sập tạm thời → BullMQ tự động retry 3 lần với exponential backoff. Lỗi hẳn thì đánh dấu job `FAILED`.
```

**File 3: `specs/csv-guest.md`** (Dựa vào `guest.controller.ts`, `guest.service.ts`)

```markdown
# Đặc Tả: Nhập Khách Mời Từ CSV

## Mô Tả
Nhập danh sách hàng ngàn khách VIP do nhãn hàng cung cấp mà không làm treo server.

## Luồng Chính
1. ORGANIZER upload file `guests.csv`.
2. File được parse dạng **Stream** (không lưu toàn bộ file vào RAM).
3. Đọc qua thư viện (vd: `csv-parser`), cứ đủ lô 500 dòng (Batch) thì kích hoạt một query `UPSERT` vào PostgreSQL.
4. Trả về thống kê: số dòng thành công, số dòng lỗi.

## Ràng Buộc
- Cấm load toàn bộ nội dung file CSV thành 1 array khổng lồ trong bộ nhớ.
- Dùng cú pháp UPSERT (`ON CONFLICT (guestCode) DO UPDATE`) để hỗ trợ nhập lại file nhiều lần nếu có chỉnh sửa từ nhãn hàng.
```
