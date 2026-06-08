# PROJECT CONTEXT: TicketBox (TicketZ)

## 1. Tổng Quan Dự Án & Business Logic
- **Mục đích chính**: Xây dựng nền tảng bán vé sự kiện âm nhạc (Concert) trực tuyến. Hệ thống giải quyết các bài toán hóc búa về quy mô lớn (High Concurrency) như: chống sập web khi mở bán, chặn bot/scalper vét vé, ngăn chặn lỗi race condition (trừ vé 2 lần, bán số lượng vé ảo), cổng thanh toán quá tải, và ứng dụng soát vé e-Ticket offline do sự kiện kém sóng 4G.
- **Đối tượng sử dụng**: 
  - *Khán giả (VIEWER)*: Tìm, mua vé và sở hữu QR Code check-in.
  - *Ban Tổ Chức (ORGANIZER)*: Theo dõi, tạo concert, tạo cấu trúc giá vé và trích xuất file AI BIO để sinh nội dung sự kiện.
  - *Nhân sự soát vé (CHECKER)*: Dùng app điện thoại check-in vé.
- **Luồng nghiệp vụ cốt lõi (Core Flows)**: 
  - **Mua vé**: Khán giả chọn vé (Polling Availability Redis) -> Nhấn mua (Rate Limit + Idempotency) -> Lua Script khóa vé trên Redis -> BullMQ Worker xử lý bất đồng bộ tạo bản ghi `Order` (PENDING) và `Ticket` xuống DB -> Điều hướng thanh toán.
  - **Thanh toán**: Thực thi giao dịch qua VNPAY -> Webhook/IPN cập nhật DB (Order -> PAID, sinh QR code). Hệ thống tự do Cronjob hủy đơn quá 15 phút không thanh toán.
  - **Check-in Offline**: Mobile app tải dữ liệu e-Ticket, scan QR cục bộ không cần 4G, tự động đồng bộ lại cache với DB khi có sóng.

## 2. Kiến Trúc Hệ Thống (System Architecture)
- **Mô hình**: Client-Server (Web App & Mobile Client giao tiếp qua REST API BE tập trung). Hạ tầng thiết kế chống dội tải bằng mô hình Message Queue và Cache Layer.
- **Frontend (FE)**:
  - *Stack*: Next.js (App Router), React, Tailwind CSS, TypeScript, Zustand (Quản lý state toàn cục như AuthModal).
  - *Folder chính*: `src/app` (routing), `src/components`, `src/services`, `src/types`, `src/utils`. 
  - *State & Fetching*: Dùng SWR (nổi bật với polling 5 giây cho API số vé còn lại với headers `stale-while-revalidate`), API Call thông qua interceptor custom cấu hình `apiClient.ts` thay vì call chay axios.
- **Backend (BE)**:
  - *Stack*: NestJS, TypeScript, PostgreSQL (qua TypeORM), Redis (caching & atomic locking `ioredis`, distributed Throttler), BullMQ (Job Queues), Pino (High performant Logger).
  - *Folder chính*: `src/auth`, `src/concert`, `src/entities`, `src/common`... (Structure chuẩn theo NestJS Module, Service, Controller).
- **Giao tiếp FE-BE**: RESTful API tiêu chuẩn (JSON payload), đính kèm Bearer Token (JWT Auth Guard).

## 3. Bản Đồ Dữ Liệu (Data Model & State)
- **Các Entity/Bảng cơ sở dữ liệu chính**:
  - `User`: Chứa Identity và Role (VIEWER, ORGANIZER, CHECKER).
  - `Concert`: Bảng cha lưu thông tin Event. Có trường enum Status (`UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED`) và track tiến trình chạy file pdf cho AI BIO. Mấu chốt thiết lập 1-Many đến bảng TicketType.
  - `TicketType`: Thiết lập định mức vé. Chứa `name`, `price`, `totalQuantity`, `soldQuantity`, `maxPerUser`. (Luôn sync số dư vé thực tế ở dạng `ticket_type:{id}:available` trên Redis).
  - `Order`: Chứa meta checkout. Trạng thái (`PENDING`, `PAID`, `CANCELLED`, `FAILED`), join 1-1 với VNPAY ID.
  - `Ticket`: Liên kết 1-nhiều với Order, chứa mã `qrCode` định danh từng vé. Trạng thái (`VALID`, `USED`, `REVOKED`), tên holderName.
- **Luồng dữ liệu quan trọng**: Order PENDING + Ticket phải được tạo *CÙNG LÚC* trong 1 Transaction. Khi Order status đổi sang `PAID`, Ticket tự động được tính là hơp lệ.

## 4. Các Quy Tắc Code & Thiết Kế (Coding Conventions & Patterns)
- **Design Pattern & Quy tắc chính**:
  - *Backend*: Áp dụng triệt để SOLID và Dependency Injection của NestJS. Request đi vào qua AuthGuard -> Throttler -> IdempotencyGuard -> Controller -> DTO Validation (class-validator) -> Service.
  - *Logging*: Bắt buộc dùng `PinoLogger` được setup thay vì `console.log` để bảo đảm capture log tốt khi ra production/Cloud.
  - *Database & Queue*: Tất cả thao tác tác động lớn không chạy block luồng Main. Phải đẩy vào Job Queue (ví dụ AI Bio Queue ở `ai-provider` hay Order Processor).
- **🚫 CẤM LÀM (Anti-patterns đặc thù dự án)**:
  - **KHÔNG** đọc/trừ số lượng vé (`soldQuantity`) thẳng xuống Postgres khi mua. PHẢI dùng Atomic lock qua Lua Script trên Redis. Khớp DB sẽ được chạy qua Queue/Worker delay phía sau.
  - **KHÔNG** tạo endpoint trực tiếp public ra ngoài gọi logic Update `TicketType` hay Order logic mà không check JWT và Role.
  - **KHÔNG** để Frontend dính líu đến business logic thanh toán, FE thuần túy chỉ catch Webhook hoặc return URL từ VNPAY.

## 5. Tổng Hợp Luồng Kỹ Thuật Chuyên Sâu (Technical Deep-Dive)

Dưới đây là tóm tắt các luồng kỹ thuật đã được implement và kiểm chứng hoạt động để người sau đọc có thể nắm ngay cách hệ thống vận hành dưới tải cao:

### 5.1. Luồng Tối Ưu Tải 4 Tầng Cache (Đọc dữ liệu cực nhanh)
Đảm bảo hàng vạn người truy cập web cùng lúc không làm sập Database.
1. **Tầng 1 (Next.js ISR):** HTML trang chủ và chi tiết sự kiện được nướng sẵn tĩnh. Truy cập không cần query DB.
2. **Tầng 2 (SWR Client):** Trình duyệt tự gọi API `/availability` mỗi 5 giây để lấy số vé thực tế. Dữ liệu tĩnh và dữ liệu vé tươi được Frontend merge lại với nhau.
3. **Tầng 3 (CDN Proxy):** Header `Cache-Control: public, s-maxage=5` ép CDN/Vercel đứng ra cản 9.999 request/giây, chỉ cho 1 request lọt xuống Backend.
4. **Tầng 4 (Redis Backend):** Backend lấy số vé thẳng từ Redis (`ticket_type:{id}:available`) siêu nhanh (<1ms) thay vì đụng vào Postgres. Lệnh `SET NX` được gọi lúc server bật (Warm-up) để nạp số dư vé từ DB vào Redis an toàn.

### 5.2. Luồng Xử lý AI Bio (Bất đồng bộ)
1. **Upload PDF:** Controller chặn file không phải PDF, sau đó nhận file Buffer lưu tạm vào RAM.
2. **BullMQ:** Buffer PDF đổi sang base64 nhét vào Queue `ticketbox.concert.ai-bio`. Trả về HTTP 202 cho FE.
3. **Worker & Provider:** Worker đọc queue, lấy text bằng `pdf-parse`, gọi Gemini API (áp dụng Dependency Injection qua `AiProviderService`). Cập nhật kết quả vào DB.
4. **FE Polling:** Giao diện Admin `setInterval` mỗi 3s hỏi BE xem job xong chưa để cập nhật UI.

### 5.3. Luồng Đặt Vé Đồng Thời - Concurrency Booking (Chống Oversell & Bão Request)
1. **Idempotency Key (Chống Double-click):** FE sinh UUID lưu vào `sessionStorage` (để hỗ trợ đồng bộ độc lập khi user mở nhiều tab). Gửi qua Header `Idempotency-Key`. Cửa ngõ BE dùng Redis `SET NX EX 3600` block ngay các request trùng lặp (trả HTTP 409).
2. **Rate Limiter (Chống Bot):** `@nestjs/throttler` cấu hình dùng `ThrottlerStorageRedisService` (chạy đồng bộ trong Distributed System) bóp băng thông API đặt vé xuống 3 req/giây/user.
3. **Khóa Nguyên Tử (Atomic Lock):** Script Lua trên Redis gộp 2 thao tác: (1) Check Limit User (`user:..:ticket_type:..:tickets_held`) và (2) Check Available Tickets. Nếu hợp lệ, trừ vé ngay lập tức. Lua Script chạy Single-thread giúp chống Oversell 100%.
4. **Xử lý Bất đồng bộ (Bảo vệ DB):** Sau khi Redis trừ vé, tống Job vào BullMQ `ticketbox.order`. BE trả luôn HTTP 202 cho FE.
5. **Worker chốt đơn:** `OrderProcessor` lấy job ra, mở Postgres Transaction tạo Order (PENDING) và n Ticket. Thành công thì lưu OrderId vào Redis. Thất bại quá số lần cho phép thì chạy Compensating Transaction (`rollbackBooking`) nhả vé lại vào kho.
6. **FE Polling State Machine:** FE gọi `GET /booking/status` mỗi 2s. Khi status `completed` thì tự navigate sang trang Checkout. Nếu status `failed` (hệ thống lỗi) thì báo FE sinh Idempotency Key mới cho user thử lại.

### 5.4. Luồng Thanh Toán Hiện Đại (Factory & Strategy Pattern)
Để đảm bảo tính mở rộng khi sau này có thêm MoMo, ZaloPay:
1. **PaymentFactory:** Dựa vào tham số truyền vào để khởi tạo đúng Strategy (hiện tại là `VnpayStrategy`).
2. **Circuit Breaker (Opossum):** Bọc quanh lời gọi API sang VNPAY. Nếu VNPAY sập hoặc phản hồi quá chậm, Circuit Breaker sẽ ngắt mạch (Open) và rớt lỗi ngay lập tức thay vì bắt hệ thống TicketBox phải đợi đến kiệt quệ tài nguyên.
3. **Webhook/IPN:** Hứng dữ liệu từ VNPAY, kiểm tra mã Hash (SHA512) để chống giả mạo, cập nhật trạng thái `Order` sang `PAID` và kích hoạt Job gửi Email chứa QR Code.
4. **CronJob dọn rác:** Mỗi phút quét các đơn `PENDING` quá 15 phút, tự động chuyển sang `CANCELLED` và gọi Lua Script nhả vé về kho trên Redis.

### 5.5. Luồng Gửi Email Bất Đồng Bộ (BullMQ)
1. **Gửi Async:** Việc gửi vé (kèm mã QR) cho hàng ngàn user cùng lúc là tác vụ cực kỳ nặng. Cứ có đơn `PAID`, hệ thống chỉ đơn giản ném Job vào Queue `ticketbox.mail` và trả response ngay cho user.
2. **Strategy Pattern cho Email:** Áp dụng Strategy cho các Provider (SendGrid, Brevo, Nodemailer-Gmail). Nếu Provider A hết hạn ngạch (quota) hoặc bị sập, có thể dễ dàng switch sang Provider B mà không cần sửa code cốt lõi.
3. **Graceful Shutdown:** Bật `app.enableShutdownHooks()`. Nếu server restart hoặc deploy bản mới, các Worker (Mail, Order) sẽ từ chối nhận Job mới, cố gắng xử lý nốt Job đang chạy rồi mới tắt để không làm rớt thư của khách.

### 5.6. Luồng Bảo Mật & Chống Bot (Defense in Depth)
Kết hợp nhiều lớp để chặn đứng dân buôn vé (Scalper):
1. **Lớp 1 (Network/Cloudflare):** Tích hợp *Cloudflare Turnstile Captcha* dạng tàng hình vào form Đăng ký, Quên MK và đặc biệt là nút Đặt Vé. Bot auto-click sẽ không có token Captcha hợp lệ và bị API văng `403 Forbidden` ngay cửa ngõ.
2. **Lớp 2 (Rate Limiter):** `@nestjs/throttler` bóp 3 req/phút/user cho API Đặt vé và Auth.
3. **Lớp 3 (Idempotency):** Khóa `SET NX` trên Redis chặn double-click.

### 5.7. Tối Ưu Tải Giao Diện (Chống Lỗi OOM)
Trang chủ không fetch toàn bộ Database nữa mà sử dụng:
1. **Phân trang (Pagination) & Lọc sự kiện Hot:** Chỉ hiển thị Top 10 sự kiện HOT trên Hero Banner (dựa vào cột `isHot`), và fetch sự kiện `UPCOMING` theo trang.
2. **Tìm kiếm (Debounce & Autocomplete):** Gõ tới đâu gọi API xổ dropdown tới đó, delay 300ms chống cháy API. Tích hợp trực tiếp trên Trang chủ, không dùng trang rời.
3. **Cronjob Cập Nhật Trạng Thái:** Chạy ngầm mỗi đêm quét các sự kiện để tự chuyển từ `UPCOMING` -> `ONGOING` -> `COMPLETED`. Tránh lỗi logic khi admin quên đổi trạng thái.

## 6. Trạng Thái Hiện Tại & Công Việc Tiếp Theo (Roadmap)

- **Trạng Thái Hiện Tại**: 
  - **[COMPLETED] Phase 1 & 2:** Core API, Auth JWT, Data Modeling, SWR Caching 4 tầng, AI Bio Worker đều đã xong.
  - **[COMPLETED] Phase 3:** Mọi giao thức khó nhất về Concurrency Booking (Redis Lua, BullMQ Order Worker, Idempotency, Throttler) đã hoàn thiện cả BE lẫn FE. Đơn hàng hiện tạo thành công với trạng thái `PENDING`.
  - **[COMPLETED] Phase 4 (Payment & Webhook):** Tích hợp VNPAY với Circuit Breaker, IPN xử lý giao dịch an toàn, Cronjob tự động hủy đơn PENDING quá hạn và nhả vé.
  - **[COMPLETED] Phase 6 (System Design & Scaling):** 
    - Áp dụng Factory/Strategy Pattern cho Payment và Mail Provider.
    - Xử lý bất đồng bộ triệt để luồng gửi Email bằng BullMQ.
    - Tích hợp Graceful Shutdown chống mất mát Job.
    - Tối ưu API Homepage: Phân trang, Search Debounce, Cronjob Auto-update Status, ngăn OOM.
    - Tích hợp Cloudflare Turnstile Captcha chống Bot phe vé (Scalper).

- **Công Việc Tiếp Theo (Roadmap)**:
  - **[NEXT] Phase 5 (Offline Check-in):** Xây dựng Flutter app quét QR đồng bộ dữ liệu local SQLite. Không cần 4G vẫn soát được vé.
  - **Phase 7 (Hoàn thiện UI/UX Homepage):** Đổ dữ liệu thật lên giao diện trang chủ mới (Hero Banner 10 HOT Concerts, List Sắp diễn ra, Dropdown Search thực tế).
