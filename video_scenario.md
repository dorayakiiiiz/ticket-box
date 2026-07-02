# 🎬 KỊCH BẢN VIDEO DEMO — TICKETBOX
**Môn: Thiết Kế Hệ Thống (System Design) | Nhóm 4 thành viên**

---

> **Hướng dẫn đọc:**
> - 🖥️ **MÀN HÌNH** = thao tác trên màn hình cần làm cùng lúc với lời nói
> - 🎙️ **LỜI NÓI** = lời thuyết trình đọc vào mic (văn nói tự nhiên)
> - 💻 **MỞ CODE** = mở file code lên trình bày
> - 🧑‍💻 **[TÊN]** = người trình bày phần đó
> - Phần nào không ghi tên = người trước đó vẫn tiếp tục

---

## BẢNG PHÂN CÔNG

| Thành viên | Phụ trách chính |
|---|---|
| **Leader (A)** | Phần mở đầu, kiến trúc, toàn bộ booking flow (phase 3), kết luận |
| **Thịnh (B)** | Admin concert CRUD, AI Bio, cache 4 tầng |
| **Đạt (C)** | Admin đơn hàng + người dùng, payment, circuit breaker, cronjob |
| **Nhật Duy (D)** | Toàn bộ mobile app, CSV import |

**Tổng thời lượng ước tính: 30–40 phút**

---
---

# PHẦN 1 — MỞ ĐẦU & BỐI CẢNH & KIẾN TRÚC
### 🧑‍💻 Leader (A) | ⏱️ ~5 phút

---

🖥️ **Mở trang chủ TicketBox đang chạy — thấy danh sách 4 concert: Anh Trai Say Hi, Anh Trai Vượt Ngàn Chông Gai, Em Xinh Say Hi, Chị Đẹp Đạp Gió Rẽ Sóng**

---

🎙️ "Dạ thưa thầy, tụi em chào thầy ạ. Sau đây nhóm em xin phép trình bày đồ án TicketBox — đây là hệ thống bán vé concert trực tuyến, và thầy đang thấy ứng dụng của nhóm em đang chạy thật trên màn hình.

Dạ bối cảnh thật ra rất gần gũi thầy ạ — ai mà từng lên mạng canh mua vé concert Chị Đẹp Đạp Gió Rẽ Sóng hay Anh Trai Say Hi thì đều biết: website sập liên tục trong phút đầu mở bán, bấm mua xong không ra vé, bị trừ tiền rồi mà order không tạo, rồi thì scalper dùng bot vét sạch vé trong vài giây rồi bán lại giá gấp mười lần. Đây đều là những vấn đề kỹ thuật thực sự, và đề bài của thầy đã liệt kê ra 7 vấn đề cụ thể yêu cầu nhóm em phải giải quyết. Trong buổi demo này, tụi em sẽ trình bày qua toàn bộ các tính năng theo flow sử dụng thực tế, và khi đến phần nào có vấn đề kỹ thuật quan trọng thì em sẽ dừng lại giải thích sâu và demo code tại chỗ ạ."

---

🖥️ **Cuộn trang chủ — thấy ảnh bìa concert, thông tin ngày giờ, địa điểm**

---

🎙️ "Về kiến trúc tổng thể, nhóm em chọn **Modular Monolith** chạy trên NestJS thay vì Microservices. Lý do cụ thể là team 4 sinh viên, Microservices đòi hỏi service mesh, distributed tracing, mỗi service phải tự quản lý database riêng — chi phí vận hành và độ phức tạp rất cao, không phù hợp với quy mô đồ án. Nhưng code nhóm em không phải viết hết vào một file — mỗi module NestJS như Auth, Concert, Booking, Payment, Notification, Ticket, Guest được tách biệt hoàn toàn, có Controller, Service, DTO riêng, sau này nếu cần tách Microservice thì ranh giới đã rõ ràng rồi ạ.

Về infrastructure: Next.js frontend deploy trên Vercel, NestJS backend deploy trên Render, PostgreSQL lưu trên Supabase, Redis đóng vai trò đa mục đích — không chỉ là cache mà còn là engine đặt vé, job queue, rate limit store, distributed lock, và idempotency store — tất cả trong một. Flutter Mobile App cho nhân sự soát vé ở cổng."

---

💻 **Mở `backend/src/app.module.ts`** — scroll qua các module đã import, chỉ vào chỗ đăng ký Global Guards

---

🎙️ "Đây là root module của backend. Thầy thấy từng module nghiệp vụ được import độc lập ạ. Quan trọng là hai dòng này — `JwtAuthGuard` và `RolesGuard` được đăng ký làm **Global Guard**, tức là tự động bảo vệ 100% endpoint, không cần khai báo lại ở từng controller.

Hệ thống có 3 role: `AUDIENCE` là khán giả mua vé, `ORGANIZER` là ban tổ chức, `STAFF` là nhân sự soát vé. JWT của web app lưu trong **HttpOnly Cookie** — loại cookie này JavaScript client không đọc được, ngăn chặn tấn công XSS tuyệt đối. JWT của mobile app lưu trong `flutter_secure_storage` và gửi qua Bearer header. Endpoint nào muốn public thì dùng decorator `@Public()` — ví dụ trang xem concert, webhook IPN của VNPAY."

---

🖥️ **Đăng xuất khỏi web (nếu đang đăng nhập) → thử truy cập thẳng vào `/admin` bằng URL → bị redirect về login**

---

🎙️ "Dạ để thầy thấy rõ hơn — em vừa đăng xuất, bây giờ thử truy cập thẳng vào trang admin mà không có token. Bị redirect về trang đăng nhập ngay lập tức. Đây là middleware guard phía frontend. Còn phía backend, nếu gọi API admin mà không có JWT hoặc không đúng role, server trả 401 hoặc 403. Phòng thủ 2 lớp độc lập."

---
---

# PHẦN 2 — ADMIN PANEL: QUẢN LÝ CONCERT & AI ARTIST BIO & DASHBOARD
### 🧑‍💻 Thịnh (B) | ⏱️ ~8 phút

---

🖥️ **Đăng nhập tài khoản Organizer → vào trang Admin Panel — thấy sidebar với các menu**

---

🎙️ "Dạ thưa thầy, em là Thịnh ạ. Em sẽ trình bày về phần Quản lý Concert và tính năng AI Artist Bio.

Đây là trang Admin Panel dành cho ban tổ chức sau khi đăng nhập ạ. Menu bên trái thầy thấy có các mục: Dashboard, Concerts, Orders, Users, và Guests. Tụi em sẽ đi qua từng phần."

---

🖥️ **Bấm vào Dashboard — thấy các card thống kê: tổng doanh thu, số vé đã bán, số đơn hàng, số concert**

---

🎙️ "Đây là trang Dashboard tổng quan ạ. Ban tổ chức có thể xem ngay tổng doanh thu, số vé bán được theo từng concert, số đơn hàng đang chờ thanh toán, và các số liệu quan trọng khác theo thời gian thực."

---

🖥️ **Bấm vào menu Concerts → thấy danh sách concert với trạng thái: UPCOMING, ONGOING, COMPLETED**

---

🎙️ "Đây là danh sách concert. Mỗi concert có trạng thái rõ ràng. Bây giờ em bấm vào nút Tạo concert mới để demo luồng tạo sự kiện."

---

🖥️ **Bấm "Tạo concert mới" → form tạo concert hiện ra → điền tên, địa điểm, ngày giờ, upload ảnh bìa → phần cấu hình Ticket Types: thêm SVIP 2 vé/tk, VIP 4 vé/tk, CAT1 4 vé/tk, GA không giới hạn**

---

🎙️ "Đây là form tạo concert ạ. Ban tổ chức điền thông tin cơ bản, upload ảnh bìa, và cấu hình các loại vé. Thầy để ý cột **maxPerUser** — đây là giới hạn tối đa số vé mỗi tài khoản được mua cho từng loại vé ạ. Ví dụ SVIP chỉ cho mua tối đa 2 vé, CAT1 tối đa 4 vé. Giới hạn này sẽ được enforce ở tầng Redis atomically ở phần booking sau — không thể lách bằng cách gửi nhiều request đồng thời ạ."

---

### AI Artist Bio — vấn đề xử lý bất đồng bộ

🖥️ **Kéo xuống phần Upload AI Bio PDF → upload một file PDF press kit → icon trạng thái chuyển từ IDLE sang PROCESSING với spinner**

---

🎙️ "Đây là tính năng **AI Artist Bio** ạ. Đề bài yêu cầu: ban tổ chức upload PDF hồ sơ nghệ sĩ, hệ thống tự động xử lý, tách nội dung, và gọi AI để tạo bản giới thiệu ngắn gọn hiển thị trên trang concert công khai.

Thầy thấy icon đang xoay — nhưng quan trọng là giao diện không bị đơ hay bắt ban tổ chức phải chờ ạ. Server trả về **202 Accepted** ngay lập tức và xử lý ngầm bên dưới."

---

💻 **Mở `backend/src/concert/ai-bio.processor.ts`**

---

🎙️ "Đây là Worker xử lý AI Bio ạ. Luồng đi như thế này: Controller nhận file PDF, validate MIME type, validate giới hạn 10MB, rồi đánh dấu `aiBioStatus = PROCESSING` trong database và ném file dưới dạng base64 vào BullMQ queue — trả về cho client ngay ạ.

Worker nhận job từ queue, dùng `pdf-parse` bóc text từ PDF, làm sạch văn bản, rồi gọi Google Gemini API với prompt engineering có sẵn để sinh ra đoạn giới thiệu. Kết quả lưu vào DB và đổi status thành DONE hoặc FAILED.

Điểm thiết kế hay ở đây là nhóm em dùng **Strategy Pattern** cho AI Provider ạ — interface `AiProviderService` chỉ có một method `summarize()`. Cả Gemini và Groq đều implement interface này. Muốn đổi AI provider hoặc thêm fallback chỉ cần thay đổi một chỗ trong cấu hình, không cần sửa Worker. Frontend poll mỗi 3 giây để hỏi trạng thái."

---

🖥️ **Chờ 10–15 giây → text AI Bio tự xuất hiện trong form**

---

🎙️ "Xong rồi ạ — AI vừa sinh xong nội dung giới thiệu từ file PDF. Giờ em lưu concert lại."

---

🖥️ **Lưu concert → quay lại danh sách → bấm vào concert vừa tạo để xem trang chi tiết public**

---

🎙️ "Và đây — trang chi tiết concert trên giao diện công khai ạ. Thầy thấy AI Bio đã hiển thị, có thông tin loại vé, giá, số lượng còn lại real-time. Bây giờ em chuyển sang giải thích phần cache vì đây là một trong những vấn đề đề bài nhắc đến ạ."

---

### Cache 4 tầng — vấn đề trang bị đọc quá tải

🎙️ "Vấn đề đề bài: trang danh sách concert và trang chi tiết bị đọc hàng nghìn lần mỗi giây trong giờ cao điểm — nếu mỗi request đều query thẳng vào database thì hệ thống sập ngay. Nhóm em thiết kế 4 tầng cache xếp chồng ạ."

---

💻 **Mở `frontend/src/app/page.tsx`** — trỏ vào `next: { revalidate: 60 }`

---

🎙️ "**Tầng 1 — Next.js ISR**: Trang danh sách concert được build thành HTML tĩnh lưu trên Vercel. Dù 1 triệu người vào cùng lúc, Vercel chỉ gọi database để revalidate HTML này mỗi 60 giây một lần. Không query DB theo từng request. Đây cũng giúp cho SEO vì bot Google thấy nội dung ngay mà không cần JavaScript."

---

💻 **Mở `frontend/src/app/booking/[id]/page.tsx`** — trỏ vào đoạn `useSWR` với `refreshInterval: 5000`

---

🎙️ "**Tầng 2 — SWR Client Cache**: Trang chi tiết concert tải data tĩnh (tên vé, giá) từ Postgres một lần. Riêng số vé còn lại thì SWR tự động poll mỗi 5 giây từ Redis — hiển thị data cũ ngay lập tức rồi cập nhật ngầm, người dùng không cảm thấy chờ."

---

💻 **Mở `backend/src/concert/concert.controller.ts`** — trỏ vào `@Header('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10')` trên endpoint `getAvailability`

---

🎙️ "**Tầng 3 — CDN Cache**: Header `Cache-Control: public, s-maxage=5` này ạ — CDN sẽ cache response trong 5 giây. Nghĩa là 10.000 trình duyệt cùng gọi API số vé, CDN chặn 9.999 lại và chỉ cho 1 request thật sự xuống backend mỗi 5 giây. Chỉ một dòng header mà chặn được 99.99% traffic.

**Tầng 4 — Redis In-Memory**: Request duy nhất lọt xuống backend đọc từ Redis key `ticket_type:{id}:available` — latency dưới 1 millisecond. PostgreSQL không bị đụng đến trừ khi có giao dịch mua vé hoặc thanh toán thành công.

Một điểm quan trọng nữa ạ: khi server NestJS khởi động, `onApplicationBootstrap` chạy tự động, query tất cả TicketType từ DB và nạp số vé vào Redis bằng lệnh `SET NX` — tức là 'chỉ set nếu key chưa tồn tại'. Lý do phải dùng NX: nếu server bị restart giữa lúc đang bán vé, Redis đang giữ số vé live thực tế rồi. Nếu ghi đè từ DB thì sẽ bị lệch. `SET NX` đảm bảo không bao giờ ghi đè data đang live ạ."

---

🖥️ **Quay lại Admin Panel → bấm vào tab Orders trong sidebar**

---

🎙️ "Phần quản lý đơn hàng thì sẽ nhờ Đạt trình bày luôn ạ vì Đạt phụ trách phần đó."

---
---

# PHẦN 3 — ADMIN PANEL: QUẢN LÝ ĐƠN HÀNG & NGƯỜI DÙNG
### 🧑‍💻 Đạt (C) | ⏱️ ~3 phút

---

🖥️ **Vẫn đang trong tab Orders — thấy danh sách đơn hàng với các trạng thái: PENDING, PAID, CANCELLED**

---

🎙️ "Dạ thưa thầy, em là Đạt ạ. Em xin trình bày về phần quản lý đơn hàng và người dùng trước, sau đó mới vào phần thanh toán kỹ thuật hơn.

Đây là danh sách tất cả đơn hàng ạ, có thể lọc theo trạng thái: PENDING là đơn đang chờ thanh toán, PAID là đã thanh toán thành công, CANCELLED là đã hủy. Ban tổ chức có thể xem chi tiết từng đơn, xem vé đã phát cho ai, doanh thu từng concert."

---

🖥️ **Bấm vào một đơn hàng PAID → thấy chi tiết: thông tin người mua, loại vé, số lượng, mã QR từng vé**

---

🎙️ "Chi tiết đơn hàng ạ — có thông tin người mua, các vé đã được phát kèm mã QR. Các mã QR này chỉ được tạo sau khi thanh toán thành công, không phải lúc đặt vé — em sẽ giải thích tại sao ở phần payment sau."

---

🖥️ **Bấm vào tab Users trong sidebar → danh sách người dùng với role, trạng thái active/inactive**

---

🎙️ "Đây là quản lý người dùng ạ. Admin có thể xem danh sách tài khoản, xem role của từng người, deactivate tài khoản vi phạm. Bây giờ tụi mình quay lại trang công khai để demo tiếp flow người dùng ạ."

---
---

# PHẦN 4 — TRẢI NGHIỆM NGƯỜI DÙNG: XEM CONCERT & ĐĂNG KÝ TÀI KHOẢN
### 🧑‍💻 Leader (A) tiếp | ⏱️ ~3 phút

---

🖥️ **Mở tab mới → trang chủ TicketBox (trang công khai) → bấm vào một concert**

---

🎙️ "Bây giờ tụi em demo từ góc nhìn khán giả ạ. Đây là trang chi tiết concert — có ảnh bìa, thông tin nghệ sĩ, AI Bio đã được gen, sơ đồ các khu vực vé, và số vé còn lại đang cập nhật tự động mỗi 5 giây từ Redis qua SWR ạ.

Khán giả chưa đăng nhập thì khi bấm 'Đặt vé' hệ thống sẽ pop up modal đăng nhập ạ. Hỗ trợ cả đăng nhập Google OAuth và đăng ký tài khoản thông thường."

---

🖥️ **Bấm "Đặt vé" khi chưa đăng nhập → modal đăng nhập hiện ra → đăng nhập bằng tài khoản Audience test → modal đóng → ở nguyên trang concert**

---

🎙️ "Sau khi đăng nhập xong, tụi em đang ở lại trang concert, không bị redirect đi đâu cả — trải nghiệm liền mạch ạ. Tài khoản vừa đăng nhập là role AUDIENCE, có thể mua vé. Giờ em tiếp tục bấm Đặt vé."

---
---

# PHẦN 5 — BOOKING FLOW: TRANH CHẤP VÉ, TẢI ĐỘT BIẾN & GIỚI HẠN PER-USER
### 🧑‍💻 Leader (A) | ⏱️ ~10 phút

---

🖥️ **Bấm "Đặt vé" → trang `/booking/[id]` mở ra → thấy sơ đồ sân khấu tương tác với các khu SVIP, VIP, CAT1, CAT2, GA → sidebar hiện danh sách loại vé với giá và số lượng còn lại**

---

🎙️ "Đây là trang Đặt vé ạ. Thầy thấy sơ đồ sân khấu tương tác — bấm vào khu nào thì sidebar bên phải highlight loại vé tương ứng. Số vé còn lại được merge từ hai nguồn: dữ liệu tĩnh (tên vé, giá) từ Postgres lúc load trang, và số lượng real-time từ Redis qua SWR mỗi 5 giây.

Bây giờ em chọn SVIP — 2 vé và bấm xác nhận. Thầy để ý trạng thái giao diện sẽ tự chuyển."

---

🖥️ **Chọn SVIP → chọn số lượng 2 → bấm "Đặt vé" → giao diện chuyển sang trạng thái submitting (spinner) → rồi chuyển sang trạng thái polling (loading full-screen)**

---

🎙️ "Giao diện vừa chuyển từ form sang màn hình loading 'Đang giữ vé' ạ. Đây là **State Machine** của trang Booking: idle khi đang chọn vé, submitting khi đang gửi request lên server, polling khi đang chờ background worker xử lý, và error nếu thất bại.

Backend đang xử lý request đặt vé này qua nhiều lớp bảo vệ ạ. Em giải thích từng lớp:"

---

### Lớp bảo vệ 1 — Rate Limiting, vấn đề tải đột biến

💻 **Mở `backend/src/app.module.ts`** — trỏ vào `ThrottlerModule.forRootAsync` với `ThrottlerStorageRedisService`

---

🎙️ "**Rate Limiting** ạ — đây là lớp đầu tiên chống tải đột biến. Nhóm em dùng `@nestjs/throttler` với **Redis storage** thay vì in-memory storage mặc định.

Tại sao phải Redis storage? Vì nếu dùng in-memory và scale lên 3 instance server, mỗi instance đếm counter riêng của nó — bot gửi 10 req/giây đến mỗi instance thực ra vẫn gửi được 30 req/giây vào hệ thống. Redis-backed thì counter được đồng bộ toàn cluster, đếm chính xác.

Toàn hệ thống giới hạn 10 request/giây. Riêng endpoint booking được `@Throttle` cấu hình chặt hơn — 3 request/giây mỗi user ạ."

---

### Lớp bảo vệ 2 — Idempotency Key, vấn đề chống trừ tiền hai lần (phía booking)

💻 **Mở `backend/src/common/guards/idempotency.guard.ts`**

---

🎙️ "**Idempotency Guard** ạ — lớp này giải quyết vấn đề đề bài đặt ra: chống trừ tiền hai lần và chống double-click.

Guard đọc header `Idempotency-Key` từ request — đây là UUID mà Frontend sinh ra. Backend dùng Redis `SET NX EX 3600`: nếu key chưa tồn tại thì set và trả OK — cho request qua; nếu key đã tồn tại rồi thì trả 409 Conflict — block ngay, không xử lý.

Phía Frontend, UUID này được sinh bằng `crypto.randomUUID()` và lưu vào `sessionStorage`. Thầy có thể hỏi tại sao không dùng `localStorage` hoặc `useRef` ạ? Câu trả lời là: `useRef` mất khi user F5 trang — UUID mới sinh ra, request cũ đang xử lý và request mới thành hai request khác nhau, có thể tạo 2 đơn. `localStorage` thì dùng chung cho tất cả tab trong cùng browser — nếu user mở 2 tab để mua 2 vé cho 2 người bạn, tab thứ 2 sẽ bị block nhầm là double-click.

`sessionStorage` là lựa chọn chính xác nhất: cô lập theo từng tab, tồn tại qua F5 trong cùng tab nhưng không chia sẻ sang tab khác ạ."

---

### Lớp bảo vệ 3 — Captcha, chặn bot tự động

💻 **Mở `backend/src/common/guards/captcha.guard.ts`**

---

🎙️ "Lớp bảo vệ thứ ba là **Captcha Guard** ạ — nhóm em dùng **Cloudflare Turnstile** thay vì reCAPTCHA truyền thống.

Tại sao cần captcha riêng dù đã có Rate Limiting? Rate Limiting chặn theo số lượng request, nhưng một con bot được thiết kế bài bản hoàn toàn có thể gửi đúng 3 request mỗi giây — chính xác dưới ngưỡng giới hạn — từ hàng nghìn IP khác nhau. Rate Limiting không phân biệt được đây là người thật hay bot ạ.

Cloudflare Turnstile thì khác — nó phân tích hành vi của trình duyệt: cách user di chuyển chuột, thời gian tương tác, fingerprint của browser, JavaScript execution environment. Bot dùng headless browser hay script tự động không qua được các bài kiểm tra hành vi này.

Cơ chế hoạt động ạ: Frontend render widget Turnstile vô hình — không bắt user giải đố hay gõ chữ, tự động chạy ngầm khi user load trang. Nếu Cloudflare đánh giá là người thật, widget trả về một **token có thời hạn ngắn**. Frontend gửi token đó kèm request đặt vé lên backend.

Guard phía backend gọi API verify của Cloudflare với token đó và secret key — nếu Cloudflare xác nhận hợp lệ thì cho qua, nếu không thì 403 ngay. Token chỉ dùng được một lần và hết hạn sau vài phút nên bot không thể tái sử dụng ạ."

---

### Trái tim hệ thống — Redis Lua Script, vấn đề tranh chấp vé & per-user limit

💻 **Mở `backend/src/redis/lua/book-ticket.lua`**

---

🎙️ "Đây là phần kỹ thuật quan trọng nhất của cả hệ thống ạ — **Redis Lua Script** để chống tranh chấp vé và enforce giới hạn per-user.

Tại sao cần Lua Script? Redis là **single-threaded**. Khi một đoạn Lua Script được nạp vào Redis và chạy, Redis khóa cửa lại — không nhận bất kỳ request nào khác — chạy script từ đầu đến cuối rồi mới mở cửa cho request tiếp theo vào. Đây gọi là **atomicity** — đảm bảo không có race condition nào có thể len vào giữa.

Script làm đúng 3 việc theo thứ tự không thể chia nhỏ:

Một là đọc số vé user này đã giữ bằng `GET user:{userId}:ticket_type:{id}:tickets_held`. Cộng vào với số lượng muốn mua — nếu vượt `maxPerUser` thì trả về `LIMIT_EXCEEDED` ngay.

Hai là đọc số vé còn lại bằng `GET ticket_type:{id}:available`. Nếu không đủ thì trả về `SOLD_OUT`.

Ba là `DECRBY` kho vé và `INCRBY` counter của user — hai lệnh này chạy cùng một lúc trong cùng một atomic block.

80.000 người bấm mua cùng mili-giây, Redis xếp hàng từng người một. 200 vé SVIP thì 200 người đầu tiên nhận SUCCESS, 79.800 người còn lại nhận SOLD_OUT trong dưới 1 millisecond. Không bao giờ có chuyện 2 người cùng thấy còn 1 vé rồi cùng mua thành công ạ."

---

💻 **Mở `backend/src/redis/redis.service.ts`** — trỏ vào `onModuleInit` với `SCRIPT LOAD` và hàm `evalsha`

---

🎙️ "Một tối ưu nhỏ nhưng quan trọng ạ: script Lua được **nạp vào RAM của Redis một lần duy nhất** lúc server khởi động bằng lệnh `SCRIPT LOAD`, Redis trả về một mã SHA1. Sau đó mỗi lần user mua vé, nhóm em chỉ gửi mã SHA1 đó thay vì gửi nguyên đoạn script dài — tiết kiệm băng thông mạng và nhanh hơn đáng kể ạ."

---

### BullMQ — bảo vệ database khỏi spike load

💻 **Mở `backend/src/booking/booking.service.ts`** — trỏ vào chỗ `this.orderQueue.add('create-order', ...)`

---

🎙️ "Sau khi Lua Script trả SUCCESS, thay vì insert thẳng vào PostgreSQL — điều đó sẽ làm DB bốc khói nếu 80.000 người cùng insert cùng lúc — nhóm em ném một job vào **BullMQ queue** và trả về 202 Accepted cho client ngay lập tức ạ."

---

💻 **Mở `backend/src/booking/order.processor.ts`** — trỏ vào `@Processor('ticketbox.order')` và phần xử lý transaction, compensating transaction

---

🎙️ "Đây là Worker ngầm bốc job từ queue ra xử lý. Worker mở Transaction, tạo Order với status PENDING, commit vào DB, rồi set cờ vào Redis để Frontend biết.

Trường hợp Worker thất bại — ví dụ DB tạm thời không kết nối được — BullMQ tự retry tối đa 3 lần với exponential backoff. Nhưng quan trọng là: nhóm em **chỉ rollback vé về Redis sau khi đã hết toàn bộ số lần retry**. Tại sao không rollback ngay lần lỗi đầu? Vì nếu rollback ở lần lỗi đầu rồi BullMQ retry thành công ở lần 2, trong khoảng thời gian giữa hai lần đó có người khác đã cướp mất slot vé trong Redis — kết quả là hệ thống bán lố, over-booking. Chỉ khi chắc chắn không thể tạo đơn nữa mới cộng vé trở lại ạ."

---

🖥️ **Quay lại trình duyệt đang ở màn hình polling → sau vài giây loading biến mất → được redirect sang trang `/checkout`**

---

🎙️ "Worker vừa tạo xong Order. Frontend đang poll `GET /booking/status` mỗi 2 giây, thấy trạng thái 'completed' và nhận được orderId — tự động navigate sang trang Checkout ạ."

---
---

# PHẦN 6 — CHECKOUT & THANH TOÁN: CIRCUIT BREAKER & CHỐNG DOUBLE CHARGE
### 🧑‍💻 Đạt (C) | ⏱️ ~8 phút

---

🖥️ **Trang `/checkout/[orderId]` hiện ra — thấy thông tin đơn hàng, đồng hồ đếm ngược 15 phút, lựa chọn VNPAY / MoMo**

---

🎙️ "Dạ thưa thầy, em Đạt xin tiếp tục ạ. Đây là trang Checkout. Thầy thấy đồng hồ đếm ngược 15 phút — đây là thời gian vé đang được giữ trong Redis cho user này. Quá 15 phút mà chưa thanh toán, một cronjob sẽ tự động hủy đơn và trả vé về kho — em sẽ nói về cronjob đó sau. Em chọn VNPAY và bấm Thanh toán."

---

🖥️ **Bấm "Thanh toán" → browser redirect sang trang VNPAY Sandbox → điền thông tin thẻ test → bấm xác nhận → được redirect về trang payment return của hệ thống**

---

🎙️ "Hệ thống vừa redirect sang VNPAY Sandbox. Em điền thông tin thẻ test theo tài liệu của VNPAY. Và đây — được redirect về trang thành công.

Nhưng phần kỹ thuật quan trọng là những gì xảy ra ngầm — luồng **Webhook IPN**. Em giải thích:"

---

### Circuit Breaker — vấn đề cổng thanh toán không ổn định

💻 **Mở `backend/src/payment/strategies/vnpay.strategy.ts`** — trỏ vào phần khởi tạo `CircuitBreaker` với `opossum`

---

🎙️ "Đây là Circuit Breaker dùng thư viện `opossum` ạ. Vấn đề đề bài đặt ra: nếu VNPAY bị sập, mà server cứ gọi API VNPAY và chờ timeout 30 giây, thread pool bị giữ chờ hết — cả hệ thống tê liệt theo.

Circuit Breaker hoạt động như cầu dao điện ạ:
- **CLOSED**: bình thường, request đi qua.
- **OPEN**: khi 50% request thất bại hoặc timeout quá 5 giây, ngắt mạch tức thì. Mọi request sau nhận 503 ngay, không chờ timeout, không giữ connection pool.
- **HALF-OPEN**: sau 30 giây, thử 1 request thăm dò — thành công thì đóng mạch trở lại.

**Graceful Degradation**: khi Circuit OPEN, trang xem concert, số vé vẫn hoạt động bình thường. Chỉ có luồng tạo URL thanh toán tạm dừng. Hệ thống bị suy giảm một phần thay vì sập hoàn toàn — đây đúng với yêu cầu đề bài: 'các tính năng không liên quan đến thanh toán vẫn phải hoạt động bình thường khi cổng thanh toán gặp sự cố' ạ."

---

### Webhook IPN & Pessimistic Lock — chống trừ tiền hai lần

💻 **Mở `backend/src/payment/payment.service.ts`** — trỏ vào hàm xử lý IPN, chỗ verify HMAC-SHA512, và `lock: { mode: 'pessimistic_write' }`

---

🎙️ "Đây là xử lý Webhook IPN ạ. VNPAY gọi server-to-server để báo kết quả giao dịch — hệ thống không tin browser của user vì user có thể tắt tab ngay sau khi quẹt thẻ.

Bước đầu tiên: **verify chữ ký HMAC-SHA512**. VNPAY tạo URL với toàn bộ params sắp xếp theo alphabet rồi hash bằng HashSecret. Backend làm lại đúng quy trình đó và so sánh hash. Sai signature là có ai đó đang giả mạo VNPAY gọi vào API — reject ngay ạ.

Bước tiếp: **kiểm tra số tiền**. Hacker có thể sửa `vnp_Amount=100` để cố mua vé triệu đồng với giá 100 đồng. Backend luôn đối chiếu `paidAmount` với `order.totalAmount` trong DB — lệch một xu cũng reject ạ.

Phần quan trọng nhất là **Pessimistic Lock** ạ — `findOne` với `lock: { mode: 'pessimistic_write' }` sinh ra SQL `SELECT ... FOR UPDATE`. VNPAY có thể gọi IPN hai lần nếu lần đầu không nhận được response kịp. Nếu 2 webhook cùng vào một lúc, `SELECT FOR UPDATE` của request thứ 2 bị PostgreSQL block đứng chờ cho đến khi request 1 commit và nhả lock. Khi request 2 tiếp tục, nó thấy `order.status` đã là PAID — bỏ qua, trả idempotent response. Tuyệt đối không trừ tiền hai lần ạ.

Trong cùng transaction: update order thành PAID, tạo từng ticket với mã QR là **UUID v4** ngẫu nhiên 36 ký tự — không tuần tự, không thể đoán, không thể làm giả. Update `soldQuantity`. Commit xong thì ném job vào notification queue để gửi email vé.

Tại sao gửi email trong queue thay vì trực tiếp trong transaction? Vì nếu Brevo API lag 5 giây, VNPAY tưởng server mình sập không trả response — gọi IPN lại dồn dập — cascading failure ạ."

---

### Cronjob — hủy đơn PENDING quá hạn & nhắc nhở 24h

💻 **Mở `backend/src/booking/cron.service.ts`** — trỏ vào job chạy mỗi 5 phút quét đơn PENDING quá 15 phút

---

🎙️ "Đây là cronjob đầu tiên ạ — chạy mỗi 5 phút, quét tất cả đơn hàng PENDING đã tồn tại quá 15 phút mà không có IPN về. Với những đơn đó, hệ thống tự động hủy đơn và hoàn vé về Redis bằng `INCRBY` — để người khác có thể mua ạ.

Còn đây là cronjob thứ hai — nhắc nhở 24 giờ trước sự kiện. Cứ mỗi 30 phút server tự thức dậy, query các concert sắp diễn ra trong 24 giờ với flag `isReminded = false`. Với mỗi concert tìm được, query tất cả đơn hàng PAID, push email nhắc nhở cho từng người vào BullMQ notification queue. Sau đó đánh dấu `isReminded = true` — để không gửi lại lần sau."

---

💻 **Mở `backend/src/redis/redis.service.ts`** — trỏ vào `acquireLock` với Redis `SET NX`

---

🎙️ "Vấn đề kỹ thuật của cronjob khi scale nhiều server: nếu 3 instance cùng chạy cronjob nhắc nhở cùng lúc, người dùng nhận 3 email y chang — rất mất uy tín. Nhóm em dùng **Distributed Lock** trên Redis ạ.

Trước khi chạy, mỗi instance thử `SET NX` key `cronjob:lock:sendEventReminders`. Instance nào `SET NX` thành công thì được chạy, 2 instance kia thấy key đã tồn tại thì tự động bỏ qua. Lock có TTL 20 phút để tự giải phóng nếu instance bị crash giữa chừng ạ."

---

🖥️ **Quay lại trình duyệt → bấm "Xem vé của tôi" → trang My Tickets hiện ra với danh sách vé và QR code**

---

🎙️ "Vé đã ra ạ. Mỗi vé có mã QR là UUID v4. Và trong inbox email cũng đã nhận được email xác nhận với vé đính kèm — email được gửi qua Brevo sau khi thanh toán thành công."

---

🖥️ **Mở hòm thư → thấy email xác nhận vé với thông tin concert và QR**

---

🎙️ "Đây là email xác nhận ạ. Hệ thống thông báo nhóm em thiết kế theo **Factory + Strategy Pattern** — interface `INotificationChannel` chỉ có một method `send()`, EmailChannel, SmsChannel, ZaloChannel đều implement. Muốn thêm kênh mới như Telegram sau này, chỉ cần tạo class mới implement interface, thêm vào Factory — không cần sửa Worker hay bất kỳ business logic nào khác. Đây là yêu cầu đề bài: 'dễ dàng bổ sung kênh thông báo mới mà không cần thay đổi lớn' ạ."

---

🖥️ **Bấm vào Account Settings (góc phải trên) → thấy form chỉnh sửa thông tin cá nhân, đổi mật khẩu, xem lịch sử vé**

---

🎙️ "Trang cài đặt tài khoản ạ — khán giả có thể chỉnh thông tin, đổi mật khẩu, xem lịch sử mua vé. Phần quên mật khẩu gửi OTP qua email cũng được xử lý ngầm qua BullMQ queue để không ảnh hưởng response time. Bây giờ mời Nhật Duy trình bày phần mobile app ạ."

---
---

# PHẦN 7 — MOBILE APP: SOÁT VÉ OFFLINE
### 🧑‍💻 Nhật Duy (D) | ⏱️ ~7 phút

---

🖥️ **Chuyển sang màn hình điện thoại/emulator Android → mở Flutter app → màn hình đăng nhập Staff**

---

🎙️ "Dạ thưa thầy, em là Nhật Duy ạ. Em sẽ trình bày về Mobile App soát vé — đây là giải pháp cho vấn đề đề bài đặt ra: nhân sự ở khu vực sóng yếu trong sân vận động vẫn phải soát vé được cho khán giả.

Thực tế ở sân vận động Mỹ Đình với 40.000 người, các trạm phát sóng 4G/5G xung quanh quá tải và tê liệt hoàn toàn. App phải hoạt động được khi không có mạng. Em đăng nhập bằng tài khoản STAFF."

---

🖥️ **Đăng nhập xong → màn hình chọn concert → bấm concert đang diễn → bấm "Đồng bộ danh sách vé" → thấy progress bar đang tải**

---

🎙️ "Đây là bước **Sync Down** — trước giờ diễn khi còn Wifi ở phòng chờ, staff bấm nút Đồng bộ. App gọi `GET /ticket/download` với concertId, nhận về toàn bộ danh sách vé hợp lệ của concert đó và lưu vào SQLite trên thiết bị. Có thể hàng chục nghìn mã QR ạ."

---

💻 **Mở `mobile/lib/services/database_helper.dart`** — trỏ vào `CREATE TABLE tickets`, `CREATE TABLE ticket_pending_queue`, và đặc biệt là `CREATE INDEX idx_tickets_qr ON tickets(qrCode)`

---

🎙️ "Đây là code tạo SQLite database trên thiết bị ạ. Nhóm em có 2 bảng quan trọng: bảng `tickets` lưu toàn bộ vé, và bảng `ticket_pending_queue` là hàng đợi lưu lịch sử các thao tác soát vé khi offline — chờ khi có mạng sẽ đồng bộ lên server.

Dòng cuối tạo `CREATE INDEX idx_tickets_qr ON tickets(qrCode)` ạ — đây không phải chi tiết nhỏ, đây là điều kiện sống còn. Không có index, tìm 1 mã QR trong 40.000 vé là O(n) — quét tuần tự từng hàng — quá chậm với yêu cầu phản hồi dưới 0.1 giây. Có index B-tree thì tra cứu chỉ O(log n) — ạ. Lý do chọn SQLite thay vì Hive hay Realm: SQLite cho phép tạo index theo chuẩn SQL cực tốt, trong khi các key-value store như Hive không có khái niệm index cho full-text lookup."

---

🖥️ **Đồng bộ xong → bấm "Bắt đầu soát vé" → màn hình camera quét QR hiện ra**

---

🎙️ "Vào màn hình quét vé rồi ạ. Bây giờ em tắt mạng hoàn toàn — mô phỏng sân vận động mất sóng."

---

🖥️ **Tắt Wifi và Data hoàn toàn → quét mã QR hợp lệ → màn hình XANH "VÉ HỢP LỆ" xuất hiện ngay lập tức**

---

🎙️ "Tắt mạng rồi ạ — App vẫn mở bình thường không bị crash. Em quét mã QR này — XANH, hợp lệ! Phản hồi trong dưới 0.1 giây. App không gọi API nào cả — tra thẳng vào SQLite local qua index ạ."

---

🖥️ **Quét lại đúng mã vừa rồi → màn hình VÀNG "VÉ ĐÃ ĐƯỢC SỬ DỤNG"**

---

🎙️ "Quét lại mã vừa rồi — VÀNG, vé đã dùng rồi. Cơ chế chống vào cổng hai lần ngay cả khi offline ạ."

---

🖥️ **Quét mã QR không tồn tại → màn hình ĐỎ "VÉ KHÔNG HỢP LỆ"**

---

🎙️ "Mã không có trong database — ĐỎ. Bây giờ em bật mạng trở lại."

---

🖥️ **Bật Wifi → App tự động hiện thông báo đang đồng bộ → hoặc bấm nút Sync Up thủ công**

---

🎙️ "App detect kết nối trở lại và âm thầm lấy tất cả bản ghi trong `ticket_pending_queue` — các vé vừa quét khi offline — và đẩy lên server qua `POST /ticket/batch-sync` ạ."

---

💻 **Mở `backend/src/ticket/sync.processor.ts`** — trỏ vào logic check `ticket.status === VALID` và phần `alreadyCheckedIn`

---

🎙️ "Đây là Worker xử lý batch sync ạ. Với mỗi vé trong lô nhận được, Worker dùng Pessimistic Lock mở transaction, query vé trong PostgreSQL thật. Nếu status vẫn là VALID thì đổi thành USED và lưu timestamp lúc quét offline làm chuẩn. Nếu status đã là USED — nghĩa là một cổng khác đã sync trước — thì bỏ qua và đếm vào `alreadyCheckedIn`.

Đây là chiến lược **First Sync Wins** — là đánh đổi có chủ ý ạ. Trong điều kiện offline, nếu ai đó clone mã QR và đưa cho 2 người vào 2 cổng, cả 2 cổng đều báo xanh. Nhưng khi sync lên server, chỉ thiết bị sync trước được chấp nhận. Thiết bị sync sau bị tính là vé gian lận dù lúc quét offline nó báo xanh — đây là giới hạn chấp nhận được của hệ thống Offline-First.

Nhóm em ưu tiên **Availability** — hoạt động được khi mất mạng — hơn Consistency tuyệt đối trong edge case rất hiếm gặp này ạ. Tradeoff này được ghi rõ trong blueprint của nhóm."

---
---

# PHẦN 8 — CSV KHÁCH MỜI VIP & NOTIFICATION FACTORY
### 🧑‍💻 Nhật Duy (D) tiếp | ⏱️ ~5 phút

---

🖥️ **Quay lại Admin Panel → bấm tab Guests trong sidebar → thấy trang quản lý khách mời VIP**

---

🎙️ "Tính năng cuối ạ — nhập danh sách khách mời VIP từ CSV. Đây là vấn đề đề bài gọi là 'Tích hợp một chiều': hệ thống quản lý khách mời của nhãn hàng không có API, cách duy nhất là nhận file CSV mà nhãn hàng gửi về. TicketBox phải import danh sách này để nhân sự soát vé xác nhận khách mời tại cổng VIP.

Em bấm Import CSV và chọn file."

---

🖥️ **Bấm "Import CSV" → chọn file CSV mẫu → thấy progress bar đang upload và xử lý → sau vài giây hiện kết quả: X dòng thành công, Y dòng cập nhật, Z dòng lỗi**

---

🎙️ "Hệ thống đã xử lý xong ạ — thống kê rõ bao nhiêu dòng được insert mới, bao nhiêu được update, bao nhiêu lỗi."

---

💻 **Mở `backend/src/guest/guest.service.ts`** — trỏ vào `Readable.from(fileBuffer.toString())`, `BATCH_SIZE = 500`, `stream.pause()`, `stream.resume()`, và `.orUpdate(['fullName', 'email', 'phone'], ['guestCode'])`

---

🎙️ "Đây là phần kỹ thuật của CSV import ạ. Vấn đề: nếu load cả file CSV vào RAM — ví dụ file 100.000 dòng — Node.js sẽ bị **Out of Memory** và crash server đang phục vụ hàng nghìn người dùng.

Giải pháp là **Stream Processing kết hợp Bulk Upsert** ạ. Thay vì load cả file, nhóm em tạo một Readable Stream đọc từng dòng — như ống nước, chỉ giữ một lượng nhỏ trong bộ nhớ tại một thời điểm. Cứ gom đủ **500 dòng** thì `stream.pause()` tạm dừng, xử lý lô 500 dòng đó, rồi `stream.resume()` tiếp.

Mỗi lô 500 dòng được chèn bằng một câu SQL duy nhất: `INSERT ... ON CONFLICT (guestCode) DO UPDATE`. Câu UPSERT này xử lý tự động dữ liệu trùng lặp — nếu nhãn hàng gửi lại file với chỉnh sửa nhỏ, hệ thống không báo lỗi mà tự cập nhật thông tin mới nhất. Nếu cả lô 500 dòng gặp lỗi, có fallback insert từng dòng để cứu vãn tối đa dữ liệu — import không dừng giữa chừng ạ."

---

🖥️ **Scroll xuống danh sách guests → thấy danh sách khách mời VIP vừa import với tên, email, mã khách mời**

---

🎙️ "Danh sách đã được import thành công ạ. Nhân sự tại cổng VIP có thể tra cứu tên khách trong Mobile App và xác nhận check-in.

Về hệ thống Notification — em muốn giải thích nhanh pattern thiết kế. Đề bài yêu cầu dễ dàng bổ sung kênh thông báo mới. Nhóm em dùng **Factory + Strategy Pattern**: interface `INotificationChannel` có một method `send()`, EmailChannel, SmsChannel, ZaloChannel implement. `NotificationFactory` nhận `ChannelType` và trả về đúng channel. Muốn thêm Telegram thì tạo class mới, thêm vào Factory — xong, không sửa Worker hay bất kỳ gì khác.

Tất cả notification đều đi qua BullMQ queue với retry tự động — không bao giờ gửi trực tiếp trong luồng API chính để không ảnh hưởng response time ạ."

---
---

# PHẦN 9 — KẾT LUẬN
### 🧑‍💻 Leader (A) | ⏱️ ~2 phút

---

🖥️ **Quay về trang chủ TicketBox**

---

🎙️ "Dạ thưa thầy, em xin phép tổng kết lại ạ.

Nhóm em đã giải quyết đủ 7 vấn đề kỹ thuật mà đề bài đặt ra:

**Tranh chấp vé** — Redis Lua Script chạy atomic, không bao giờ oversell dù 80.000 người cùng bấm.

**Giới hạn vé per-user** — enforce ngay trong cùng Lua Script, cùng một atomic operation, không thể lách bằng nhiều request đồng thời.

**Tải đột biến** — 4 tầng cache xếp chồng (ISR, SWR, CDN, Redis) giảm tải database, Rate Limiting Redis-backed đồng bộ toàn cluster, BullMQ queue tách booking khỏi DB write.

**Thanh toán không ổn định** — Circuit Breaker 3 trạng thái, Graceful Degradation giữ phần còn lại hoạt động khi VNPAY sập.

**Trừ tiền hai lần** — Idempotency Key phía booking, Pessimistic Lock `SELECT FOR UPDATE` phía webhook IPN.

**Soát vé offline** — SQLite offline-first với INDEX trên qrCode, Pending Queue, First Sync Wins khi đồng bộ.

**Tích hợp CSV một chiều** — Stream Processing + Bulk Upsert chống OOM và xử lý duplicate tự động.

Và thêm vào đó là AI Artist Bio, Notification Factory dễ mở rộng, và Distributed Lock cho cronjob multi-instance.

Tụi em xin hết ạ, cảm ơn thầy đã theo dõi và kính mời thầy đặt câu hỏi ạ."

---
---

## CHECKLIST TRƯỚC KHI QUAY

- [ ] Backend và frontend đang chạy ổn định, kiểm tra kết nối Redis và Postgres
- [ ] Seed data: 4 concert mẫu đầy đủ vé và dữ liệu
- [ ] Chuẩn bị sẵn file PDF press kit để demo AI Bio (file không quá 2MB cho nhanh)
- [ ] Chuẩn bị sẵn file CSV mẫu 50–100 dòng khách mời để demo import
- [ ] Flutter app đã cài trên điện thoại thật hoặc emulator Android, đăng nhập sẵn tài khoản STAFF
- [ ] Có tài khoản test: 1 Organizer, 1 Audience, 1 Staff
- [ ] Hòm thư Brevo đang hoạt động, kiểm tra nhận email trước
- [ ] Clear cache trình duyệt, đóng hết tab thừa, tắt popup notification của OS
- [ ] Mở sẵn các file code trong VS Code theo từng phần trước khi quay
- [ ] Thực hành chạy thử toàn bộ flow ít nhất 1–2 lần

**Thiết lập quay:** 1920×1080, bitrate ~720 kbps, định dạng MP4, webcam PiP góc phải dưới màn hình
