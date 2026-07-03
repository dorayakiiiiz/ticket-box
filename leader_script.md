# 🎬 KỊCH BẢN CHI TIẾT DÀNH RIÊNG CHO LEADER (A)
**TicketBox System Design Demo**

> **Lưu ý:**
> - Các phần kỹ thuật được phân tích xoáy sâu vào code backend, frontend và kiến trúc trong blueprint.
> - Bỏ qua chi tiết "sơ đồ tương tác", chỉ nhấn mạnh đó là ảnh tĩnh xem để biết khu vực.
> - Đã bổ sung phần Captcha chặn bot vào đúng flow.

---

## PHẦN 1 — MỞ ĐẦU, BỐI CẢNH & KIẾN TRÚC (⏱️ ~5 phút)

🖥️ **MÀN HÌNH:** Mở trang chủ TicketBox đang chạy — thấy danh sách 4 concert.

🎙️ **LỜI NÓI:**
"Dạ thưa thầy, tụi em chào thầy ạ. Sau đây nhóm em xin phép trình bày đồ án môn Thiết Kế Hệ Thống với sản phẩm là hệ thống bán vé concert trực tuyến TicketBox. Như thầy đang thấy, đây là ứng dụng của nhóm em đang được deploy và chạy thật.

Dạ bối cảnh của bài toán này xuất phát từ một thực tế rất gần gũi: những khi mở bán vé các concert lớn như Anh Trai Say Hi hay Chị Đẹp Đạp Gió Rẽ Sóng, chúng ta thường thấy website sập ngay trong phút đầu tiên, hoặc bấm thanh toán bị trừ tiền nhưng không ra vé, và đặc biệt là tình trạng gian lận dùng bot vét sạch vé trong vài mili-giây rồi bán lại chợ đen. Đề bài của thầy đã đặt ra 7 bài toán kỹ thuật rất thực tế để giải quyết các tình trạng đó. Hôm nay, tụi em sẽ demo xuyên suốt một luồng sử dụng thực tế, và khi đi đến chức năng nào giải quyết bài toán của đề bài, tụi em sẽ mở thẳng code lên để phân tích sâu giải pháp ạ.

Đầu tiên, về mặt kiến trúc tổng thể trong blueprint, nhóm em đã quyết định chọn mô hình **Modular Monolith** chạy trên NestJS thay vì Microservices. Lý do thực tiễn là với nguồn lực team 4 sinh viên, nếu chạy Microservices sẽ kéo theo sự phức tạp khổng lồ về vận hành như service mesh, distributed tracing hay quản lý data consistency giữa các database độc lập. Tuy nhiên, kiến trúc Modular Monolith của tụi em được chia thành các module ranh giới rất rõ ràng: Auth, Concert, Booking, Payment, Ticket... Nếu sau này cần scale và tách ra thành các Microservices thực thụ thì việc bóc tách đã được chuẩn bị sẵn."

🖥️ **MÀN HÌNH:** Cuộn trang chủ.

🎙️ **LỜI NÓI:**
"Về hạ tầng, tụi em deploy Next.js frontend trên Vercel, NestJS backend trên Render, dùng PostgreSQL làm cơ sở dữ liệu chính trên Supabase. Còn Redis trong hệ thống này đóng vai trò cực kỳ quan trọng — nó không chỉ làm cache mà còn là trái tim của engine đặt vé, làm job queue, rate limit store và distributed lock."

💻 **MỞ CODE:** Mở file `backend/src/app.module.ts` — bôi đen chỗ đăng ký `JwtAuthGuard` và `RolesGuard`.

🎙️ **LỜI NÓI:**
"Dạ đây là root module của backend ạ. Thầy có thể thấy từng module nghiệp vụ được import hoàn toàn độc lập. Điểm nhấn ở đây là cách tụi em thiết kế bảo mật: `JwtAuthGuard` và `RolesGuard` được tụi em đăng ký làm **Global Guard**. Nghĩa là hệ thống tự động khóa 100% các endpoint theo mặc định, lập trình viên không cần nhớ phải khai báo lại ở từng controller, tránh rủi ro quên bảo mật.

Hệ thống phân quyền theo RBAC với 3 role: `AUDIENCE`, `ORGANIZER`, và `STAFF`. Với Web, tụi em lưu JWT vào **HttpOnly Cookie** — điều này triệt tiêu hoàn toàn rủi ro bị tấn công XSS vì JavaScript phía client không thể nào đọc được cookie này. Còn Mobile app cho Staff thì lưu token vào `flutter_secure_storage` có mã hóa."

🖥️ **MÀN HÌNH:** Đăng xuất khỏi web → thử gõ URL `/admin` → bị đẩy về trang đăng nhập.

🎙️ **LỜI NÓI:**
"Dạ em vừa test thử việc truy cập thẳng vào trang admin khi chưa đăng nhập, hệ thống lập tức chặn và đẩy về trang login. Đây là bảo vệ ở frontend, còn nếu cố tình dùng Postman gọi thẳng API thì backend lập tức trả về 401 hoặc 403 ạ. Lớp bảo vệ vòng ngoài rất chặt chẽ.

*(Chuyển mic cho Thịnh trình bày Phần 2 & Đạt Phần 3...)*"

---

## PHẦN 4 — TRẢI NGHIỆM KHÁN GIẢ & ĐĂNG NHẬP (⏱️ ~3 phút)

*(Nhận lại mic sau khi Đạt trình bày xong phần Admin)*

🖥️ **MÀN HÌNH:** Mở tab mới → trang chủ TicketBox public → bấm vào một concert.

🎙️ **LỜI NÓI:**
"Dạ vâng, bây giờ em xin tiếp tục trình bày luồng hệ thống từ góc nhìn của khán giả mua vé ạ.

Đây là trang chi tiết concert. Thầy có thể thấy ảnh bìa, AI Bio, và đặc biệt là danh sách vé bên phải. Dữ liệu này được kết hợp từ dữ liệu tĩnh của Postgres và số vé cập nhật real-time từ Redis thông qua SWR mỗi 5 giây. Nếu khán giả chưa đăng nhập mà bấm 'Đặt vé', thay vì redirect làm đứt gãy luồng thao tác, hệ thống sẽ bật modal đăng nhập ngay tại trang, giữ nguyên bối cảnh sử dụng để tối ưu UX ạ."

🖥️ **MÀN HÌNH:** Bấm "Đặt vé" → đăng nhập tài khoản Audience → ở nguyên trang concert.

🎙️ **LỜI NÓI:**
"Sau khi đăng nhập xong, em vẫn ở trang concert và giờ em sẽ tiếp tục luồng mua vé."

---

## PHẦN 5 — BOOKING FLOW: TRANH CHẤP VÉ, TẢI ĐỘT BIẾN, CAPTCHA & PER-USER (⏱️ ~10 phút)

🖥️ **MÀN HÌNH:** Bấm "Đặt vé" → trang `/booking/[id]` mở ra → thấy sơ đồ sân khấu (ảnh tĩnh) và sidebar danh sách vé.

🎙️ **LỜI NÓI:**
"Dạ đây là màn hình chọn vé. Chỗ này có một ảnh tĩnh sơ đồ sân khấu để khán giả dễ hình dung vị trí các khu vực GA, VIP hay SVIP. 

Bây giờ em chọn khu SVIP, mua 2 vé và bấm Đặt vé. Thầy để ý giao diện sẽ chuyển trạng thái liên tục."

🖥️ **MÀN HÌNH:** Chọn SVIP → SL: 2 → Bấm "Đặt vé" → Nút biến thành spinner (submitting) → Chuyển sang màn hình loading (polling) → Vài giây sau tự động redirect sang trang `/checkout`.

🎙️ **LỜI NÓI:**
"Như thầy thấy, quá trình giữ vé diễn ra rất nhanh. Giao diện frontend dùng kiến trúc State Machine chuyển mượt mà từ idle -> submitting -> polling, và hiện tại đã lấy được mã đơn hàng để redirect sang trang Thanh toán. 
Tuy nhiên, đằng sau vài giây ngắn ngủi đó, backend phải đối mặt với tải cực lớn. Giả sử có 80.000 người cùng bấm Đặt vé như em vừa nãy, thì request vừa phải lọt qua những lớp bảo vệ nào để đến được đây? Em xin phép mở code phân tích sâu 4 lớp khiên cốt lõi của chức năng Booking."

### Lớp 1: Rate Limiting (Chống bão tải)
💻 **MỞ CODE:** `backend/src/app.module.ts` — bôi đen đoạn `ThrottlerModule.forRootAsync` và `ThrottlerStorageRedisService`.

🎙️ **LỜI NÓI:**
"Lớp phòng thủ ngoài cùng là **Rate Limiting**. Thầy có thể thấy ở đoạn code này tụi em không dùng RAM mặc định mà dùng `ThrottlerStorageRedisService` truyền vào cấu hình của NestJS. Tại sao phải tốn công kết nối Redis? Trong blueprint tụi em có phân tích: nếu deploy 3 instance Node.js đằng sau Load Balancer, nếu lưu RAM thì bot gửi 10 request/giây vào mỗi instance thực ra nó đang bào hệ thống 30 request/giây. Dùng Redis làm storage chung đảm bảo counter đếm cực kỳ chuẩn xác trên toàn cụm server (distributed environment). Tiếp đến, tụi em dùng decorator `@Throttle` ngay trên Controller đặt vé để giới hạn đúng 3 request/giây cho một user."

### Lớp 2: Idempotency Key (Chống double-click và spam)
💻 **MỞ CODE:** `frontend/src/app/booking/[id]/page.tsx` — bôi đen đoạn `crypto.randomUUID()` và lưu vào `sessionStorage`. Tiếp tục mở `backend/src/common/guards/idempotency.guard.ts` — bôi đen đoạn dùng Redis `SET NX`.

🎙️ **LỜI NÓI:**
"Tiếp theo là lớp **Idempotency Guard**. Nếu người dùng mạng chập chờn, bấm nút mua vé 3 lần liên tục thì sao? Thầy nhìn vào code Frontend trang booking này ạ, ngay khi user vào trang, code sinh ra một UUID ngẫu nhiên bằng `crypto.randomUUID()` và lưu vào `sessionStorage`. Khi gọi API đặt vé, UUID này gắn vào Header `Idempotency-Key`.
Tại sao tụi em cố tình dùng `sessionStorage` mà không phải `localStorage` hay biến trạng thái `useRef`? Vì `useRef` sẽ bị reset nếu user lỡ tay F5 trang. Còn `localStorage` thì chia sẻ chung cho tất cả tab — lỡ user mở 2 tab mua 2 vé riêng biệt cho bạn bè thì tab thứ 2 sẽ bị backend block nhầm. `sessionStorage` giải quyết hoàn hảo: nó cô lập theo từng tab và sống sót qua những cú F5.
Nhìn sang phía Backend ở Idempotency Guard này, tụi em dùng lệnh `SET NX` của Redis để lưu UUID. Lệnh này đảm bảo tính nguyên tử tuyệt đối: chỉ request đầu tiên set thành công và lọt vào block tiếp theo, 2 request đến trễ 1 mili-giây do double-click lập tức bị đá văng với mã lỗi 409 Conflict."

### Lớp 3: Captcha Guard (Chặn bot tinh vi)
💻 **MỞ CODE:** `backend/src/common/guards/captcha.guard.ts` — bôi đen đoạn gọi API `fetch` đến endpoint verify của Cloudflare.

🎙️ **LỜI NÓI:**
"Tuy nhiên, nếu bot được thiết kế quá thông minh, gửi request từ các proxy khác nhau và tuân thủ đúng luật 3 request/giây thì Rate Limit chịu thua. Do đó tụi em cài đặt thêm lớp thứ ba: **Captcha Guard** với Cloudflare Turnstile.
Điểm hay của Turnstile là khán giả không phải nhìn hình chọn đèn giao thông. Widget chạy ẩn ở Frontend, tự động phân tích hành vi chuột, thời gian tải trang và các fingerprint của JavaScript execution. Headless browser của hacker sẽ bị đánh trượt ngay. Widget sinh ra một token ngắn hạn gửi lên backend. Nhìn vào đoạn code Guard này, backend sẽ trích xuất token từ Header và gọi trực tiếp API của Cloudflare để kiểm tra tính hợp lệ. Chỉ khi Cloudflare trả về success thì request mới được đi tiếp. Token này chỉ dùng 1 lần và hết hạn rất nhanh nên không thể xài lại."

### Lớp 4: Redis Lua Script (Giải quyết tranh chấp vé & Per-user limit)
💻 **MỞ CODE:** `backend/src/redis/lua/book-ticket.lua` — lướt qua luồng logic của script. Tiếp tục mở `backend/src/redis/redis.service.ts` — bôi đen đoạn `SCRIPT LOAD` và hàm `evalsha`.

🎙️ **LỜI NÓI:**
"Và khi đã lọt qua 3 lớp khiên trên, request mới tiến vào trái tim của hệ thống: **Redis Lua Script**. Đây là lời giải triệt để cho bài toán tranh chấp vé (Race Condition) và kiểm soát số vé tối đa mỗi user.
Redis có đặc thù là **single-threaded** (đơn luồng). Khi đoạn Lua này chạy, Redis đóng băng toàn bộ các thao tác khác, xử lý nó như một atomic block (khối nguyên tử).
Thầy nhìn vào đoạn script này, nó làm 3 việc liên tiếp cực nhanh:
1. Dùng lệnh `GET` đọc biến đếm số vé user đã mua. Có thể thầy sẽ hỏi "biến đếm này ở đâu ra mà có sẵn trong Redis?". Dạ thật ra lúc đầu nó **không hề tồn tại** ạ. Lần đầu user bấm mua, Redis `GET` ra giá trị null, code Lua của tụi em sẽ dùng phép fallback `or '0'` để tự động coi nó là 0. Lát nữa lệnh `INCRBY` chạy ở bước 3, Redis sẽ tự động khởi tạo key này và cộng dồn lên. Nó cộng 0 với số lượng đang xin mua, nếu lớn hơn `maxPerUser` (ví dụ SVIP chỉ được 2 vé), nó lập tức `return 'LIMIT_EXCEEDED'`. Nhờ vậy hacker không thể dùng bão request để lách luật mua 3 vé được.
2. Kiểm tra kho vé còn đủ hay không, không thì `return 'SOLD_OUT'`.
3. Nếu hợp lệ, nó chạy `DECRBY` trừ vé trong kho và `INCRBY` tăng vé cho user cùng lúc. Tất cả nằm trong một giao dịch nguyên tử.
Ngoài ra, ở file `redis.service.ts` này, nhóm em tối ưu bằng cách nạp script vào RAM của Redis một lần duy nhất lúc khởi động server qua lệnh `SCRIPT LOAD`. Sau đó chỉ dùng mã băm SHA1 qua lệnh `evalsha` để gọi, tiết kiệm băng thông mạng tối đa.
Nếu 80.000 người vào, Redis xếp hàng xử lý từng người trong vài micro-giây. Sẽ có đúng 200 người nhận SUCCESS và 79.800 người bị văng ra mà PostgreSQL chưa hề bị chạm tới."

### BullMQ Queue & Worker
💻 **MỞ CODE:** `backend/src/booking/booking.service.ts` — bôi đen đoạn `this.orderQueue.add()`. Sau đó mở `backend/src/booking/order.processor.ts` — bôi đen đoạn Worker set status thành công vào Redis và khối `catch` xử lý hoàn vé.

🎙️ **LỜI NÓI:**
"Nhận được SUCCESS từ Redis, thay vì insert thẳng vào Database, đoạn code ở `booking.service.ts` này lập tức nhét một Job vào **BullMQ Queue** rồi phản hồi HTTP 202 Accepted cho user. Ngay lúc này Frontend chuyển sang trạng thái Polling (màn hình Loading đầy trang).
Ở background, Worker ở file `order.processor.ts` này sẽ ngầm rút từng job ra xử lý để tạo Order trong PostgreSQL, giúp Database không bao giờ bị nghẽn tải (bottleneck). Khi xử lý xong xuôi, Worker làm một bước cực kỳ quan trọng: nó **lưu trạng thái 'completed' kèm theo Order ID trở lại vào Redis** (dùng chính cái Idempotency Key ban nãy làm khóa tra cứu).
Về phần xử lý lỗi (Compensating Transaction), lỡ Worker lưu vào database thất bại do DB mất kết nối, BullMQ tự động retry 3 lần. Ở phần `catch` error này, tụi em thiết lập chỉ hoàn vé lại kho Redis khi đã cạn sạch 3 lần retry để tránh bán lố vé ạ."

🖥️ **MÀN HÌNH:** Mở file `frontend/src/services/bookingService.ts` — bôi đen hàm `checkStatus` (poll API mỗi 2s). Cuối cùng quay lại màn hình trình duyệt đang ở trang `/checkout`.

🎙️ **LỜI NÓI:**
"Thầy có thể thắc mắc làm sao Frontend biết Worker đã làm xong để tự động chuyển trang ban nãy? Thầy nhìn vào đoạn code Frontend này ạ: Frontend thiết lập một interval liên tục gọi API `GET /booking/status` **mỗi 2 giây** để hỏi thăm Redis.
Ngay khi Frontend đọc được status 'completed' và lấy được Order ID từ Redis, nó lập tức tắt màn hình Loading và điều hướng thẳng sang trang Checkout như kết quả thầy đang thấy trên màn hình đây ạ.
Đến đây luồng của em tạm dừng, xin mời Đạt tiếp tục phân tích phần Thanh toán ạ."

*(Chuyển mic cho Đạt)*

---

## PHẦN 9 — KẾT LUẬN TỔNG KẾT (⏱️ ~2 phút)

*(Nhận lại mic sau khi Duy trình bày xong CSV)*

🖥️ **MÀN HÌNH:** Quay về trang chủ TicketBox.

🎙️ **LỜI NÓI:**
"Dạ thưa thầy, em xin phép đại diện nhóm tổng kết lại toàn bộ đồ án.

Nhóm em đã triển khai thành công và giải quyết trọn vẹn 7 bài toán kỹ thuật hóc búa nhất mà đề bài đặt ra:
1. **Tranh chấp vé:** Dùng Redis Lua Script chạy atomic, đảm bảo tính nguyên tử, triệt tiêu oversell.
2. **Giới hạn vé per-user:** Enforce khắt khe ngay trong lòng Lua Script, không có kẽ hở cho bot spam request lách luật.
3. **Tải đột biến:** Tụi em phân tán lực bằng 4 tầng Cache (ISR, SWR, CDN, Redis In-memory), Rate Limiting tập trung qua Redis, và hãm xung database bằng Message Queue BullMQ.
4. **Thanh toán không ổn định:** Ứng dụng Circuit Breaker pattern (Opossum) để tự động ngắt mạch VNPAY, thiết kế Graceful Degradation để giữ app sống khỏe.
5. **Trừ tiền hai lần:** Áp dụng Idempotency Key tại vòng ngoài và Pessimistic Lock (`SELECT FOR UPDATE`) ở vòng trong (Webhook IPN).
6. **Soát vé offline:** Mô hình SQLite Offline-first trên Flutter với B-tree INDEX, kết hợp hàng đợi local và chiến lược First Sync Wins.
7. **Tích hợp hệ thống Legacy (CSV):** Dùng Node.js Stream Processing và Bulk Upsert để nhập hàng trăm ngàn dòng CSV mà không gây sập RAM (OOM).

Ngoài ra tụi em còn áp dụng Strategy Pattern cho hệ thống AI Bio và Notification Factory để đáp ứng tính mở rộng (Scalability) của kiến trúc.

Dạ phần trình bày của nhóm em đến đây là kết thúc. Tụi em xin chân thành cảm ơn thầy đã chú ý lắng nghe, và tụi em rất mong nhận được những câu hỏi phản biện từ thầy ạ."
