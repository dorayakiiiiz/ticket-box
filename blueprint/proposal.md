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
- ✅ Xem danh sách và chi tiết concert (kể cả số vé còn lại theo thời gian thực)
- ✅ Mua vé với cơ chế chống tranh chấp và giới hạn per-user
- ✅ Thanh toán qua VNPAY và MoMo (Sandbox môi trường kiểm thử)
- ✅ Nhận e-ticket dạng mã QR sau thanh toán thành công
- ✅ Thông báo xác nhận qua email và nhắc nhở trước 24 giờ
- ✅ Trang quản trị (Admin) cho ban tổ chức
- ✅ Mobile app soát vé với khả năng offline
- ✅ AI sinh tóm tắt nghệ sĩ từ PDF press kit (tích hợp Google Gemini)
- ✅ Nhập danh sách khách mời VIP từ file CSV

**Cơ chế kỹ thuật bắt buộc:**
- ✅ Rate Limiting chống bot và tải đột biến
- ✅ Circuit Breaker bảo vệ khi cổng thanh toán sự cố
- ✅ Idempotency Key chống trừ tiền hai lần
- ✅ Multi-layer Cache (4 tầng) giảm tải database
- ✅ RBAC (Role-Based Access Control) phân quyền theo nhóm người dùng
- ✅ Distributed Lock chống race condition trong môi trường multi-instance
- ✅ Atomic Lua Script trên Redis chống overselling

### Ngoài Phạm Vi (Out of Scope)

- ❌ **Tích hợp payment gateway thật** — chỉ dùng sandbox (VNPAY Sandbox, MoMo Sandbox), không xử lý tiền thật
- ❌ **Hoàn tiền tự động (Refund)** — khi hủy concert, quy trình hoàn tiền sẽ thực hiện thủ công ngoài hệ thống
- ❌ **In vé vật lý** — chỉ hỗ trợ e-ticket dạng mã QR
- ❌ **Hệ thống báo cáo tài chính nâng cao** — không có tích hợp kế toán hay xuất hóa đơn VAT
- ❌ **Đặt chỗ ngồi cụ thể (Seat selection)** — hệ thống quản lý theo khu (GA, VIP...) không theo ghế đánh số

---

## Rủi Ro và Ràng Buộc

Dưới đây là sáu rủi ro kỹ thuật đã được xác định từ đầu và giải pháp thiết kế tương ứng được áp dụng trong hệ thống:

### R1 — Tranh Chấp Vé (Race Condition — Overselling)

**Mô tả rủi ro:** Khi nhiều người cùng mua vé cuối cùng trong cùng một mili-giây, nếu không có cơ chế đồng bộ nguyên tử, hệ thống có thể cấp vé cho nhiều người hơn số lượng thực tế (overselling).

**Hậu quả nếu xảy ra:** Khán giả đã thanh toán nhưng không có chỗ vào cổng — tổn thất uy tín nghiêm trọng và trách nhiệm pháp lý.

**Giải pháp thiết kế:**
Redis Lua Script thực thi nguyên tử (atomic) — Redis đơn luồng đảm bảo chỉ một request được xử lý tại một thời điểm. Script kiểm tra đồng thời tính khả dụng của vé và giới hạn per-user, sau đó trừ vé trong một thao tác không thể chia nhỏ (indivisible). Không có window of vulnerability giữa đọc và ghi.

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

---

### R4 — Trừ Tiền Hai Lần (Double-Payment — Idempotency Violation)

**Mô tả rủi ro:** Người dùng bấm thanh toán nhiều lần, mạng lag khiến request bị gửi lại tự động (retry), hoặc ứng dụng mobile tự retry — dẫn đến cùng một giao dịch được xử lý nhiều lần.

**Hậu quả nếu xảy ra:** Khách hàng bị trừ tiền nhiều lần hoặc nhận nhiều vé không mong muốn — tổn thất tài chính trực tiếp.

**Giải pháp thiết kế:**
**Idempotency Key** — mỗi phiên mua vé, Frontend sinh một UUID duy nhất và lưu vào `sessionStorage` (phân lập theo tab, tránh nhầm với tab khác). UUID này gửi kèm mọi request qua header `Idempotency-Key`. Backend dùng Redis `SET NX EX 3600` để đảm bảo chỉ request đầu tiên được xử lý; mọi request sau với cùng key bị trả về 409 Conflict ngay lập tức.

Phía webhook, **Pessimistic Lock** (`SELECT FOR UPDATE`) trên PostgreSQL đảm bảo dù VNPAY gọi IPN nhiều lần, chỉ lần đầu tiên thay đổi trạng thái đơn hàng — các lần sau được bỏ qua an toàn.

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