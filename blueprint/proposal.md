# TicketBox — Project Proposal

## Vấn Đề

### Bối Cảnh Thực Tế

Trong những năm gần đây, các concert âm nhạc lớn tại Việt Nam như Anh Trai Say Hi, Anh Trai Vượt Ngàn Chông Gai, Em Xinh Say Hi, Chị Đẹp Đạp Gió Rẽ Sóng... thu hút hàng chục nghìn khán giả và trở thành sự kiện văn hóa đại chúng quan trọng. Tuy nhiên, khâu bán vé luôn là điểm nóng gây ra tranh cãi và bức xúc trong cộng đồng.

### Các Vấn Đề Cụ Thể

**1. Hạ Tầng Kỹ Thuật Không Đủ Tải**

Khi ban tổ chức mở bán, website thường xuyên sập hoàn toàn trong vài phút đầu tiên do lượng truy cập đồng thời vượt quá ngưỡng chịu tải. Dự kiến một concert lớn như Chị Đẹp Đạp Gió Rẽ Sóng thu hút khoảng **80.000 người truy cập trong 5 phút đầu**, trong đó **70% dồn vào phút đầu tiên**. Không có hệ thống bán vé thông thường nào được thiết kế để chịu đựng mức tải đột biến kiểu này nếu không có kiến trúc đặc biệt.

**2. Tranh Chấp Vé — Bán Lố**

Một số loại vé SVIP của concert Anh Trai Say Hi chỉ có 200 chỗ nhưng có thể có hàng chục nghìn khán giả cố mua cùng lúc ngay khi mở bán. Nếu hệ thống không xử lý đúng, nhiều người sẽ thanh toán thành công nhưng số lượng vé thực tế không còn đủ, dẫn đến tình trạng bán lố — khán giả mất tiền nhưng không có chỗ vào cổng.

**3. Mất Tiền Không Nhận Được Vé**

Khán giả bị trừ tiền qua chuyển khoản hoặc cổng thanh toán nhưng không nhận được vé do lỗi hệ thống xử lý thanh toán giữa chừng, mạng ngắt đột ngột, hoặc không có cơ chế xác nhận hai chiều giữa hệ thống bán vé và cổng thanh toán.

**4. Scalper Bot Vét Sạch Vé**

Các nhóm buôn bán vé chợ đen sử dụng script tự động (bot) để mua hết vé trong vài giây ngay khi mở bán, sau đó rao bán lại với giá gấp nhiều lần mặt vé. Đây là vấn đề mang tính hệ thống do không có cơ chế phân biệt người dùng thật và bot, cũng như không giới hạn số lượng vé theo tài khoản.

**5. Kênh Bán Vé Rời Rạc, Thiếu Chuyên Nghiệp**

Nhiều sự kiện vẫn bán vé qua các kênh phi chính thức: Zalo OA, Google Form, chuyển khoản thủ công. Các kênh này không đảm bảo tính công bằng, không có cơ chế chống gian lận, không cung cấp e-ticket chuẩn hóa để soát vé, và hoàn toàn không thể xử lý tải khi lượng người mua lớn.

**6. Soát Vé Thủ Công và Không Đáng Tin Cậy**

Tại cổng vào, nhân sự thường soát vé bằng cách kiểm tra thủ công hoặc dùng các thiết bị không kết nối với hệ thống trung tâm. Tại các địa điểm lớn như sân vận động Mỹ Đình hay Hòa Bình, khi hàng chục nghìn người tập trung, mạng di động 4G/5G trở nên quá tải và không ổn định, khiến các hệ thống soát vé online truyền thống hoàn toàn tê liệt.

---

## Mục Tiêu

Hệ thống TicketBox được xây dựng nhằm giải quyết toàn diện các vấn đề trên, với các mục tiêu cụ thể và có thể đo lường được:

### Mục Tiêu Kỹ Thuật

| Mục tiêu | Chỉ số cụ thể |
|---|---|
| **Chịu tải đột biến** | Hỗ trợ 80.000 người truy cập đồng thời trong 5 phút đầu mở bán mà không sập |
| **Chống bán lố (Overselling)** | Zero oversell — không bao giờ bán nhiều hơn số vé thực tế có sẵn, dù có hàng chục nghìn request đồng thời |
| **Chống double-payment** | Mỗi giao dịch chỉ được xử lý đúng một lần, dù người dùng bấm nhiều lần hoặc mạng ngắt giữa chừng |
| **Uptime khi cổng TT sự cố** | Khi VNPAY/MoMo sự cố, các tính năng xem thông tin và danh sách vé vẫn hoạt động bình thường |
| **Soát vé offline** | Nhân sự soát vé vẫn làm việc bình thường dù mất mạng hoàn toàn tại sân vận động |
| **Giới hạn vé per-user** | Không thể mua vượt hạn mức dù gửi nhiều request đồng thời từ nhiều tab |

### Mục Tiêu Nghiệp Vụ

- **Số hóa toàn bộ quy trình** bán vé từ lúc mở bán đến khi khán giả vào cổng sự kiện
- **Chuẩn hóa e-ticket** dưới dạng mã QR duy nhất cho mỗi vé, có thể quét nhanh tại cổng
- **Hỗ trợ đa kênh thanh toán** (VNPAY, MoMo) với khả năng mở rộng thêm kênh mới
- **Dễ dàng mở rộng thông báo** — hỗ trợ Email, SMS, Zalo OA mà không cần thay đổi lớn kiến trúc
- **Tự động hóa nội dung** — tích hợp AI sinh tóm tắt nghệ sĩ từ tài liệu PDF, giảm công sức ban tổ chức

---

## Người Dùng và Nhu Cầu

Hệ thống phục vụ ba nhóm người dùng với quyền hạn và nhu cầu khác nhau:

### Khán Giả (VIEWER)

**Nhu cầu:** Tìm kiếm và mua vé concert nhanh chóng, nhận e-ticket an toàn, check-in thuận tiện tại cổng.

**Điều quan trọng nhất:**
- Trải nghiệm mua vé công bằng — không bị bot cướp trước
- Không lo mất tiền oan — giao dịch rõ ràng, nhận vé ngay sau khi thanh toán
- Biết số vé còn lại theo thời gian thực để quyết định có nên cố mua không

**Các tính năng cần thiết:**
- Xem danh sách concert với thông tin đầy đủ (nghệ sĩ, địa điểm, ngày giờ, sơ đồ chỗ ngồi)
- Chọn loại vé và số lượng (GA, VIP, SVIP, CAT1, CAT2)
- Thanh toán qua VNPAY hoặc MoMo
- Nhận e-ticket dạng mã QR qua email và app
- Nhận thông báo nhắc nhở trước sự kiện 24 giờ

### Ban Tổ Chức (ORGANIZER)

**Nhu cầu:** Quản lý toàn bộ vòng đời concert từ tạo sự kiện đến theo dõi doanh thu, không cần kiến thức kỹ thuật.

**Điều quan trọng nhất:**
- Kiểm soát hoàn toàn cấu hình vé — số lượng, giá, hạn mức mua
- Nắm được số lượng vé bán và doanh thu theo thời gian thực
- Không phải viết thủ công nội dung giới thiệu nghệ sĩ

**Các tính năng cần thiết:**
- Tạo concert mới với đầy đủ thông tin: tên, ngày, địa điểm, poster
- Cấu hình loại vé (tên, giá, số lượng, thời điểm mở bán, hạn mức per-user)
- Upload PDF press kit — hệ thống tự động sinh AI Bio hiển thị trên trang concert
- Theo dõi thống kê bán vé và doanh thu
- Hủy concert và xử lý hoàn tiền

### Nhân Sự Soát Vé (CHECKER)

**Nhu cầu:** Xác nhận vé tại cổng nhanh chóng và chính xác, kể cả khi mất mạng.

**Điều quan trọng nhất:**
- Phản hồi tức thì — < 0.5 giây mỗi lần quét
- Không bị gián đoạn khi mạng yếu hoặc mất hoàn toàn
- Không cho vào hai lần với cùng một vé

**Các tính năng cần thiết:**
- Đồng bộ danh sách vé hợp lệ về thiết bị trước giờ sự kiện
- Quét mã QR và kiểm tra trực tiếp từ local database — không cần mạng
- Tự động đồng bộ kết quả soát vé lên server khi có kết nối
- Hỗ trợ xác nhận khách mời VIP từ danh sách CSV của nhãn hàng tài trợ

---

## Phạm Vi

### Trong Phạm Vi (In Scope)

Hệ thống TicketBox trong phạm vi đồ án bao gồm đầy đủ các tính năng sau:

**Tính năng nghiệp vụ:**
- Xem danh sách và chi tiết concert (kể cả số vé còn lại theo thời gian thực)
- Mua vé với cơ chế chống tranh chấp và giới hạn per-user
- Thanh toán qua VNPAY và MoMo (Sandbox môi trường kiểm thử)
- Nhận e-ticket dạng mã QR sau thanh toán thành công
- Thông báo xác nhận qua email và nhắc nhở trước 24 giờ
- Trang quản trị (Admin) cho ban tổ chức
- Mobile app soát vé với khả năng offline
- AI sinh tóm tắt nghệ sĩ từ PDF press kit (tích hợp Google Gemini)
- Nhập danh sách khách mời VIP từ file CSV

**Cơ chế kỹ thuật bắt buộc:**
- Rate Limiting chống bot và tải đột biến
- Circuit Breaker bảo vệ khi cổng thanh toán sự cố
- Idempotency Key chống trừ tiền hai lần
- Multi-layer Cache (4 tầng) giảm tải database
- RBAC (Role-Based Access Control) phân quyền theo nhóm người dùng
- Distributed Lock chống race condition trong môi trường multi-instance
- Atomic Lua Script trên Redis chống overselling

### Ngoài Phạm Vi (Out of Scope)

- [Ngoài phạm vi] **Tích hợp payment gateway thật** — chỉ dùng sandbox (VNPAY Sandbox, MoMo Sandbox), không xử lý tiền thật
- [Ngoài phạm vi] **Hoàn tiền tự động (Refund)** — khi hủy concert, quy trình hoàn tiền sẽ thực hiện thủ công ngoài hệ thống
- [Ngoài phạm vi] **In vé vật lý** — chỉ hỗ trợ e-ticket dạng mã QR
- [Ngoài phạm vi] **Hệ thống báo cáo tài chính nâng cao** — không có tích hợp kế toán hay xuất hóa đơn VAT
- [Ngoài phạm vi] **Đặt chỗ ngồi cụ thể (Seat selection)** — hệ thống quản lý theo khu (GA, VIP...) không theo ghế đánh số

---

## Rủi Ro và Ràng Buộc

Dưới đây là sáu rủi ro kỹ thuật đã được xác định từ đầu và giải pháp thiết kế tương ứng được áp dụng trong hệ thống:

### R1 — Tranh Chấp Vé (Race Condition — Overselling)

**Mô tả rủi ro:** Khi nhiều người cùng mua vé cuối cùng trong cùng một mili-giây, nếu không có cơ chế đồng bộ nguyên tử, hệ thống có thể cấp vé cho nhiều người hơn số lượng thực tế (overselling).

**Hậu quả nếu xảy ra:** Khán giả đã thanh toán nhưng không có chỗ vào cổng — tổn thất uy tín nghiêm trọng và trách nhiệm pháp lý.

**Giải pháp thiết kế:**
Redis Lua Script thực thi nguyên tử (atomic) — Redis đơn luồng đảm bảo chỉ một request được xử lý tại một thời điểm. Script kiểm tra đồng thời tính khả dụng của vé và giới hạn per-user, sau đó trừ vé trong một thao tác không thể chia nhỏ (indivisible). Không có window of vulnerability giữa đọc và ghi.

**Tại sao chọn giải pháp này?**

| Tiêu chí | Redis Lua Script (Đã chọn) | Pessimistic Lock trên DB | Optimistic Lock (Version Column) |
|---|---|---|---|
| **Latency** | < 1ms (in-memory) | 5–15ms (disk I/O + lock wait) | 5–10ms + retry overhead |
| **Throughput** | ~100.000 ops/giây | ~2.000–5.000 ops/giây (bị lock contention) | ~5.000 ops/giây nhưng retry storm khi high contention |
| **Atomic guarantee** | Single-threaded, hoàn toàn atomic | Atomic trong transaction nhưng có lock wait | Không atomic — cần retry loop, dễ bị starvation |
| **Phù hợp 80K concurrent** | Có — Thiết kế cho high-concurrency | Không — Lock contention gây bottleneck | Không — Retry storm khi hàng nghìn request cùng update |
| **Độ phức tạp** | Trung bình — cần viết Lua script | Thấp — chỉ cần `SELECT FOR UPDATE` | Thấp — thêm `@Version()` column |

**Lý do chọn:** Với kịch bản 80.000 người mua vé đồng thời, Redis Lua Script là lựa chọn duy nhất đáp ứng cả ba yêu cầu: latency < 1ms, throughput > 50.000 ops/giây, và đảm bảo zero oversell. Pessimistic Lock gây bottleneck nghiêm trọng khi hàng nghìn transaction chờ nhau; Optimistic Lock dẫn đến retry storm khi contention cao.

---

### R2 — Tải Đột Biến (Spike Load — Hệ Thống Sập)

**Mô tả rủi ro:** 80.000 người truy cập trong 5 phút đầu mở bán, tập trung 70% vào phút đầu tiên, vượt xa ngưỡng chịu tải của bất kỳ hệ thống đơn thuần nào.

**Hậu quả nếu xảy ra:** Website sập, không ai mua được vé, doanh thu mất hoàn toàn trong thời gian vàng.

**Giải pháp thiết kế:**
Chiến lược phòng thủ nhiều lớp:
- **Tầng 1 (CDN/Next.js ISR):** HTML tĩnh phục vụ hàng nghìn request/giây mà không cần query database
- **Tầng 2 (CDN Proxy Cache):** Header `s-maxage=5` cho API số vé — CDN chặn 99.99% request, chỉ 1 request mỗi 5 giây lọt xuống backend
- **Tầng 3 (Redis Cache):** Số vé lưu trong Redis in-memory, phục vụ trong < 1ms
- **Tầng 4 (Rate Limiting):** Throttler giới hạn 3 req/giây/user cho API đặt vé, ngăn bot và cấp request lặp
- **BullMQ Queue:** Tách bạch việc "giữ vé" (< 1ms, qua Redis) khỏi việc "tạo đơn hàng" (DB I/O) — backend không bao giờ block dưới tải

**Tại sao chọn giải pháp này?**

| Tiêu chí | Multi-layer Defense (Đã chọn) | Scale-up Server (Vertical) | Microservices + Load Balancer |
|---|---|---|---|
| **Chi phí** | Thấp — Redis + BullMQ đều miễn phí | Cao — cần server mạnh hơn | Rất cao — cần nhiều server + orchestration |
| **Hiệu quả với spike load** | Có — Chặn từ CDN, chỉ ~0.01% request tới DB | Không — Vẫn phải xử lý toàn bộ request | Có — Nhưng cần auto-scaling phức tạp |
| **Độ phức tạp triển khai** | Trung bình — cấu hình ISR + Redis + Queue | Thấp — chỉ cần nâng cấp hardware | Rất cao — service mesh, deployment pipeline |
| **Phù hợp đồ án** | Có — Chứng minh kiến thức kiến trúc sâu | Không — Không thể hiện kỹ năng thiết kế | Không — Quá phức tạp cho scope đồ án |

**Lý do chọn:** Phòng thủ nhiều lớp cho phép xử lý tải đột biến bằng chiến lược "chặn sớm" — CDN hấp thụ phần lớn traffic, Redis xử lý logic nghiệp vụ nhanh, và Queue giãn tải DB. Giải pháp này vừa hiệu quả vừa chứng minh kiến thức kiến trúc hệ thống phân tán, phù hợp hơn so với scale-up đơn thuần (không thể hiện kỹ năng thiết kế) hay microservices (quá phức tạp cho phạm vi đồ án).

---

### R3 — Thanh Toán Không Ổn Định (Payment Gateway Failure)

**Mô tả rủi ro:** Cổng thanh toán VNPAY hoặc MoMo có thể gặp sự cố, phản hồi chậm (timeout) hoặc ngừng hoạt động hoàn toàn trong giờ cao điểm.

**Hậu quả nếu xảy ra:** Nếu backend cứ tiếp tục chờ VNPAY phản hồi, các kết nối sẽ bị chiếm giữ, thread pool cạn kiệt và cả hệ thống sập theo (Cascading Failure).

**Giải pháp thiết kế:**
**Circuit Breaker** (thư viện `opossum`) bọc mọi lời gọi ra cổng thanh toán:
- **CLOSED:** Hoạt động bình thường
- **OPEN:** Khi 50% request thất bại — ngắt mạch ngay lập tức, trả 503 mà không cần chờ timeout, giải phóng tài nguyên hệ thống
- **HALF-OPEN:** Sau 30 giây tự thử lại 1 request, nếu thành công đóng mạch trở lại

Khi mạch ngắt: Trang xem thông tin concert và danh sách vé vẫn hoạt động bình thường — chỉ có luồng thanh toán bị tạm dừng.

**Tại sao chọn giải pháp này?**

| Tiêu chí | Circuit Breaker (Đã chọn) | Retry đơn giản (Exponential Backoff) | Timeout cứng + Fallback |
|---|---|---|---|
| **Chống cascading failure** | Có — Ngắt mạch ngay — giải phóng thread | Không — Retry tích tụ gây quá tải thêm | Hạn chế — Giảm tải nhưng vẫn chờ timeout mỗi request |
| **Tự hồi phục** | Có — HALF-OPEN tự thử lại sau 30s | Không — Cần can thiệp thủ công | Không — Cần restart hoặc config lại |
| **Quan sát được (Observability)** | Có — Trạng thái CLOSED/OPEN/HALF-OPEN rõ ràng | Không — Không có trạng thái tổng thể | Không — Chỉ biết từng request timeout |
| **Trải nghiệm người dùng** | Có — Trả lỗi nhanh (fail-fast) thay vì chờ | Không — Người dùng chờ lâu qua nhiều lần retry | Hạn chế — Chờ hết timeout mới trả lỗi |
| **Thư viện hỗ trợ** | `opossum` — mature, dễ cấu hình | Tự viết hoặc dùng `axios-retry` | Tự viết |

**Lý do chọn:** Khi cổng thanh toán sự cố, retry đơn giản chỉ làm tình hình tồi tệ hơn — hàng nghìn request retry đồng thời gây quá tải cả backend lẫn cổng thanh toán (cascading failure). Circuit Breaker ngắt mạch ngay lập tức, trả lỗi nhanh cho người dùng, và tự động thử lại khi cổng thanh toán hồi phục — không cần can thiệp thủ công.

---

### R4 — Trừ Tiền Hai Lần (Double-Payment — Idempotency Violation)

**Mô tả rủi ro:** Người dùng bấm thanh toán nhiều lần, mạng lag khiến request bị gửi lại tự động (retry), hoặc ứng dụng mobile tự retry — dẫn đến cùng một giao dịch được xử lý nhiều lần.

**Hậu quả nếu xảy ra:** Khách hàng bị trừ tiền nhiều lần hoặc nhận nhiều vé không mong muốn — tổn thất tài chính trực tiếp.

**Giải pháp thiết kế:**
**Idempotency Key** — mỗi phiên mua vé, Frontend sinh một UUID duy nhất và lưu vào `sessionStorage` (phân lập theo tab, tránh nhầm với tab khác). UUID này gửi kèm mọi request qua header `Idempotency-Key`. Backend dùng Redis `SET NX EX 3600` để đảm bảo chỉ request đầu tiên được xử lý; mọi request sau với cùng key bị trả về 409 Conflict ngay lập tức.

Phía webhook, **Pessimistic Lock** (`SELECT FOR UPDATE`) trên PostgreSQL đảm bảo dù VNPAY gọi IPN nhiều lần, chỉ lần đầu tiên thay đổi trạng thái đơn hàng — các lần sau được bỏ qua an toàn.

**Tại sao chọn giải pháp này?**

| Tiêu chí | Idempotency Key + Pessimistic Lock (Đã chọn) | Chỉ dùng DB Unique Constraint | Distributed Lock (Redis Redlock) |
|---|---|---|---|
| **Chống double-click phía client** | Có — Redis SET NX chặn ngay ở tầng cache | Hạn chế — Phải chờ request tới DB mới phát hiện | Có — Nhưng cần setup Redlock phức tạp |
| **Chống duplicate webhook** | Có — `SELECT FOR UPDATE` khoá dòng, chỉ 1 lần xử lý | Hạn chế — Unique constraint throw error, cần handle | Hạn chế — Có thể bị clock drift giữa Redis nodes |
| **Hiệu năng** | Có — Client-side chặn ở Redis (< 1ms), webhook lock chỉ trên dòng cụ thể | Hạn chế — Mọi request đều tới DB | Hạn chế — Thêm round-trip Redis cho mỗi webhook |
| **Độ phức tạp** | Trung bình — 2 cơ chế cho 2 vấn đề khác nhau | Thấp — chỉ cần thêm unique index | Cao — cần ≥ 3 Redis instances cho Redlock |
| **Phù hợp dự án** | Có — Giải quyết đúng 2 vấn đề riêng biệt | Không — Không chặn được double-click nhanh | Không — Over-engineering cho single Redis instance |

**Lý do chọn:** Double-payment có hai nguồn gốc khác nhau: (1) client gửi request lặp — giải quyết bằng Redis Idempotency Key ở tầng cache, và (2) webhook gọi lại nhiều lần — giải quyết bằng Pessimistic Lock ở tầng DB. Mỗi cơ chế giải quyết đúng vấn đề ở đúng tầng, thay vì dùng một giải pháp "one-size-fits-all".

---

### R5 — Soát Vé Khi Mất Mạng (Offline Operation)

**Mô tả rủi ro:** Tại sân vận động Mỹ Đình hay các nhà thi đấu lớn, khi hàng chục nghìn khán giả tập trung, các trạm phát sóng xung quanh quá tải và tê liệt hoàn toàn. Nhân sự soát vé không thể gọi API lên server.

**Hậu quả nếu xảy ra:** Nhân sự không thể soát vé, cổng vào tắc nghẽn, trải nghiệm người dùng tệ và rủi ro mất kiểm soát an ninh sự kiện.

**Giải pháp thiết kế:**
**Offline-First Architecture** cho Flutter mobile app:
- Trước sự kiện (khi có Wifi): Tải toàn bộ danh sách vé hợp lệ về SQLite local với INDEX trên `qrCode`
- Tại cổng (không có mạng): Tra cứu và cập nhật trực tiếp từ SQLite — phản hồi < 0.1 giây
- Khi bắt được sóng: Hàng đợi (Pending Queue) các thao tác offline tự động đồng bộ lên server qua BullMQ

**Chiến lược giải quyết xung đột:** "First Sync Wins" — thiết bị nào đồng bộ lên server trước thì kết quả của thiết bị đó được chấp nhận. Đây là đánh đổi có chủ ý: trong điều kiện offline, một vé clone có thể được quét thành công ở hai cổng, nhưng khi đồng bộ lên server, chỉ một trong hai lần quét được ghi nhận là hợp lệ.

**Tại sao chọn giải pháp này?**

| Tiêu chí | Offline-First + SQLite (Đã chọn) | Online-Only (gọi API mỗi lần quét) | Bluetooth Mesh giữa các thiết bị |
|---|---|---|---|
| **Hoạt động khi mất mạng** | Có — Hoàn toàn độc lập, < 0.1s | Không — Tê liệt hoàn toàn | Hạn chế — Chỉ hoạt động nếu các thiết bị gần nhau |
| **Tốc độ quét** | < 0.1 giây (SQLite lookup) | 0.5–2 giây (network round-trip) | 0.3–1 giây (BLE latency) |
| **Chống duplicate check-in** | Hạn chế — Khi offline áp dụng First Sync Wins | Có — Server kiểm tra real-time | Hạn chế — Phụ thuộc đồng bộ mesh |
| **Độ phức tạp** | Trung bình — SQLite + sync queue | Thấp — chỉ cần gọi API | Rất cao — BLE protocol, mesh networking |
| **Phù hợp sân vận động lớn** | Có — Thiết kế cho Mỹ Đình, 40.000+ người | Không — Mạng 4G/5G sẽ sập | Không — Bluetooth range giới hạn, không scale |

**Lý do chọn:** Tại các sự kiện lớn (30.000–40.000 người), mạng di động gần như chắc chắn quá tải. Online-Only không phải là lựa chọn khả thi. Offline-First với SQLite đảm bảo soát vé vẫn hoạt động bình thường với tốc độ < 0.1 giây, dù hoàn toàn mất kết nối. Trade-off "First Sync Wins" là chấp nhận được vì xác suất một vé bị quét ở 2 cổng khác nhau khi offline là rất thấp, và khi online lại, server sẽ phát hiện và chỉ ghi nhận 1 lần.

---

### R6 — Tích Hợp Dữ Liệu Một Chiều (CSV Guest Import)

**Mô tả rủi ro:** Hệ thống quản lý khách mời của nhãn hàng tài trợ không có API — chỉ cung cấp file CSV gửi qua email vào ban đêm. File có thể chứa dữ liệu trùng lặp, format không đồng nhất, và kích thước lớn (5.000 – 100.000 dòng).

**Hậu quả nếu xảy ra:** Load toàn bộ file vào RAM → server crash (OOM). Xử lý lặp lại → duplicate records trong database. File lỗi → crash toàn bộ tiến trình import.

**Giải pháp thiết kế:**
**Stream Processing + Bulk Upsert:**
- Đọc CSV theo luồng (stream), từng dòng một — không bao giờ load toàn bộ file vào RAM
- Gom lại thành lô 500 dòng → một câu SQL `INSERT ... ON CONFLICT DO UPDATE` duy nhất (Bulk Upsert)
- Tự động xử lý trùng lặp (dựa trên `guestCode`) mà không báo lỗi
- Fallback từng dòng nếu cả lô 500 dòng gặp lỗi — import vẫn tiếp tục thay vì crash toàn bộ

**Tại sao chọn giải pháp này?**

| Tiêu chí | Stream + Bulk Upsert (Đã chọn) | Load-all vào RAM rồi xử lý | Queue mỗi dòng thành 1 job BullMQ |
|---|---|---|---|
| **Sử dụng bộ nhớ** | Có — O(batch_size) — chỉ giữ 500 dòng trong RAM | Không — O(n) — file 100.000 dòng chiếm ~50MB RAM | Có — O(1) per job nhưng tổng queue rất lớn |
| **Tốc độ xử lý** | Có — Nhanh — 1 câu SQL cho 500 dòng | Hạn chế — Nhanh nhưng rủi ro OOM crash | Không — Chậm — overhead mỗi job (serialize, deserialize) |
| **Xử lý lỗi** | Có — Batch fail → fallback single insert | Không — Nếu crash giữa chừng, mất toàn bộ | Có — Mỗi job retry độc lập |
| **Idempotent (import lại)** | Có — `ON CONFLICT DO UPDATE` — import nhiều lần không duplicate | Không — Cần tự kiểm tra trùng | Hạn chế — Cần thêm deduplication logic |
| **Phù hợp 100K dòng** | Có — Thiết kế cho file lớn | Không — Rủi ro OOM | Hạn chế — 100K jobs = Redis memory pressure |

**Lý do chọn:** File CSV khách mời có thể lên tới 100.000 dòng, được gửi nhiều lần (cập nhật hàng đêm). Stream Processing đảm bảo server không bao giờ bị OOM dù file lớn đến đâu. Bulk Upsert (`ON CONFLICT DO UPDATE`) đảm bảo import lại nhiều lần mà không tạo duplicate — giải quyết triệt để vấn đề dữ liệu trùng lặp. Queue mỗi dòng thành job riêng sẽ gây áp lực lớn lên Redis và chậm hơn đáng kể so với batch insert trực tiếp.