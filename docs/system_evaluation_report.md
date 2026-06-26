# Báo Cáo Đánh Giá Hệ Thống TicketBox (Theo Spec Đồ Án)

Sau khi đối chiếu yêu cầu trong `spec.md` với mã nguồn hiện tại của dự án (bao gồm `frontend`, `backend`, `mobile`, và `docs`), dưới đây là nhận xét tổng quan, các điểm thiếu sót, và đề xuất cải tiến để đảm bảo hệ thống đạt điểm tuyệt đối cho môn System Design.

> [!NOTE]
> Tính năng tải lên file CSV Guest List không được đề cập trong báo cáo này theo yêu cầu của bạn.

---

## 1. Đánh Giá Kiến Trúc & Tài Liệu (Phần 1 - Blueprint)

### Tình trạng hiện tại:
Dự án đã có các tài liệu như `solution.md`, `system-architect.md` và các file `phase..._code_details.md` giải thích cách giải quyết vấn đề (Tranh chấp vé, Rate Limiting, Mobile Offline...). Tuy nhiên, cấu trúc tài liệu chưa tuân thủ chặt chẽ định dạng được yêu cầu.

### 🔴 Các thiếu sót:
- **Sai cấu trúc thư mục Template Blueprint**: `spec.md` yêu cầu nộp tài liệu dưới cấu trúc thư mục `blueprint/` gồm `proposal.md`, `design.md`, và `specs/`. Hiện tại toàn bộ tài liệu đang để dạng phẳng trong folder `docs/`.
- **Thiếu sơ đồ C4 và High-Level Architecture chuẩn chỉnh**: Mặc dù `solution.md` có vẽ sơ đồ C4 Level 2 Container bằng Mermaid, nhưng chưa có System Context (Level 1) rõ ràng, và sơ đồ luồng dữ liệu (High-Level Architecture Diagram) cho các nghiệp vụ cụ thể (như luồng offline sync) vẫn chưa chi tiết.

### 💡 Đề xuất cải tiến:
- Cấu trúc lại thư mục tài liệu: Tạo thư mục `blueprint/` và phân bổ lại nội dung từ các file hiện có vào `proposal.md`, `design.md`, `specs/auth.md`, v.v.
- Bổ sung C4 Context Diagram (Level 1) cho thấy rõ sự tương tác giữa TicketBox với VNPAY/MoMo, Email Provider (Brevo) và Gemini AI.

---

## 2. Đánh Giá Mã Nguồn & Thiết Kế Hệ Thống (Phần 2 - Cài Đặt)

Dự án đã áp dụng stack công nghệ tốt (Next.js, NestJS, Flutter, PostgreSQL, Redis, BullMQ). Tuy nhiên, xét trên góc độ System Design cho production, hệ thống có **6 lỗ hổng nghiêm trọng** đã được phát hiện trong `system_design_flaws.md` cùng với một số thiếu sót UI.

### 🔴 Các thiếu sót và Lỗ hổng cần xử lý:

1. **Thiếu Sơ đồ ghế ngồi SVG tương tác (Frontend):** 
   - Yêu cầu `spec.md`: "sơ đồ SVG tương tác theo khu: GA, SVIP, VIP...".
   - Thực tế: Frontend trang `concert/[id]` chỉ hiển thị danh sách các loại vé dạng text. Cần bổ sung UI tương tác SVG để người dùng click chọn khu vực.

2. **Lỗi Đồng Bộ Redis Cache (Nguy cơ bán lố vé - Overselling):**
   - Công thức Fallback cache đang lấy `totalQuantity - soldQuantity` mà bỏ qua số lượng vé đang bị giam trong đơn hàng `PENDING` (15 phút). Nếu Redis khởi động lại trong lúc có nhiều người đang thanh toán, hệ thống sẽ bơm lại số vé ảo và bán lố sức chứa.

3. **Thiếu Rate Limiting Đặc Thù cho Auth (Nguy cơ Spam/DDoS):**
   - Global throttler là không đủ. Các API như Quên mật khẩu / Đăng nhập cần có ThrottlerGuard riêng (ví dụ 3 requests/phút) để tránh bị botnet gọi liên tục làm tốn chi phí gửi email và khóa domain.

4. **Sát thủ toàn bảng - Thiếu Database Indexes:**
   - Các Cronjob quét định kỳ bảng `Order` (hủy đơn chưa thanh toán) và bảng `Concert` (gửi mail nhắc nhở) đang phải làm "Full-Table Scan" vì các cột `status`, `createdAt`, `isReminded` không được đánh Index. Dưới tải lớn sẽ làm sập CPU database.

5. **Lỗi Xóa Cứng Dữ Liệu (Hard Delete):**
   - Việc gọi `this.concertRepo.remove()` trong API Admin sẽ xóa vĩnh viễn dữ liệu tài chính hoặc gây lỗi khóa ngoại. Cần chuyển sang "Xóa mềm" (`@DeleteDateColumn()`).

6. **Rò rỉ bộ nhớ (Missing Pagination):**
   - API lấy danh sách Concert hiện không giới hạn số lượng trả về (`limit`/`offset`). Trả về hàng nghìn record một lúc sẽ gây OOM (Out Of Memory) trên NodeJS server.

7. **Thiếu Graceful Shutdown (Bảo vệ tiến trình nền):**
   - File `main.ts` chưa gọi `app.enableShutdownHooks()`. Nếu server tự động restart, các BullMQ workers xử lý đơn hàng/gửi mail sẽ bị cắt ngang ngay lập tức dẫn đến mất dữ liệu không mong muốn.

8. **Kiến trúc Notification bị "đóng cứng" (Hard-coupled) với Email (Vi phạm OCP):**
   - Yêu cầu `spec.md`: "dễ dàng bổ sung kênh thông báo mới (ví dụ: Zalo OA, SMS) trong tương lai mà không cần thay đổi lớn".
   - Thực tế: Backend hiện tại có một module `mail`, interface `IMailStrategy` và queue `mail-queue` chỉ thiết kế riêng biệt cho Email (chấp nhận tham số `to`, `subject`, `html`). Kiến trúc này rất tốt để đổi nhà cung cấp *Email* (từ Nodemailer sang Brevo), nhưng **hoàn toàn không thể** thêm kênh mới (SMS, Zalo OA, Push Notification) mà không đập bỏ sửa lại toàn bộ core. (SMS/Zalo không dùng HTML hay subject email). Điều này vi phạm nghiêm trọng nguyên lý Open-Closed Principle (OCP) trong System Design.

### 💡 Đề xuất cải tiến (Hành động Code):
- **Frontend:** Thêm component `InteractiveMap.tsx` chứa file SVG của sân vận động (có thể mượn SVG open source của sân Mỹ Đình/QK7) và map với các `ticketType` ID.
- **Backend - TypeORM:** Thêm decorator `@Index(['status', 'createdAt'])` vào `Order` entity; thêm `@DeleteDateColumn()` cho `Concert`.
- **Backend - Cache:** Sửa hàm `getAvailability()` query thêm tổng vé đang PENDING để trừ hao khi set lại Redis.
- **Backend - App:** Thêm `app.enableShutdownHooks()` ở hàm `bootstrap()` trong `main.ts`. Cập nhật phân trang cho API get all concerts.
- **Backend - Notification Architecture:** Đổi tên `mail` module thành `notification` module. Áp dụng **Factory Pattern** và **Strategy Pattern**:
  - Tạo interface `INotificationChannel` với hàm `send(recipientId, templateId, payload)`.
  - Viết các class `EmailChannel`, `SmsChannel`, `ZaloChannel` implement interface này.
  - Hàng đợi (BullMQ) đổi thành `notification-queue`, nhận payload chứa `channelType`. Worker (Processor) chỉ cần gọi `ChannelFactory.get(channelType).send(...)`. Nhờ đó, mai mốt thêm kênh Telegram hay Push App thì chỉ cần viết class mới, không cần đụng vào core code cũ.

---

## 3. Đánh Giá Ứng Dụng Mobile (Soát Vé Offline)

### Tình trạng hiện tại:
Mã nguồn Flutter (`mobile/`) đã có cấu trúc sử dụng `sqflite` (local DB) và `connectivity_plus` (kiểm tra mạng), cùng `NetworkSyncService` chạy nền.

### 💡 Nhận xét và đề xuất:
- Giải pháp "Last Write Wins" dựa vào timestamp cho app soát vé offline rất sát với thực tế. Tuy nhiên cần đảm bảo rằng worker sync (khi có mạng lại) xử lý được conflict. Nếu có hai thiết bị offline cùng quét 1 vé và cùng sync lên server, server phải từ chối cái đến sau dựa vào timestamp trong QR code.
- Yêu cầu phải xử lý tốt giao diện lúc quét QR. `mobile_scanner` cần có hiệu ứng UI rõ ràng (âm thanh bíp + màu xanh/đỏ lớn) để nhân viên soát vé nhận diện vé hợp lệ/không hợp lệ ngoài trời nắng mà không cần nhìn kĩ màn hình.

---

## 4. Tổng Kết

Dự án hiện tại đã xây dựng được "xương sống" vững chắc cho một hệ thống bán vé khả mở (áp dụng Queue, Redis Cache nguyên tử). Tuy nhiên, vì đây là một đồ án **System Design**, giáo viên sẽ chấm rất kỹ vào những **edge cases** (trường hợp biên) và **failure points** (điểm chết) của hệ thống. 

Nếu bạn khắc phục triệt để 6 lỗ hổng backend kể trên, bổ sung sơ đồ SVG tương tác ở Frontend, và chuẩn hóa lại tài liệu Blueprint thành các thư mục rõ ràng, đồ án sẽ trở thành một hệ thống "Production-Grade" thực thụ và chắc chắn đạt điểm cao.
