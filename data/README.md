# Database & Môi Trường Chạy

**Lưu ý dành cho giáo viên:**

Trong quá trình phát triển, hệ thống đã được cấu hình chạy hoàn toàn trên Cloud. Cơ sở dữ liệu sử dụng **PostgreSQL (qua Supabase)** và **Redis Cloud**. Do đó, trên hệ thống đã có sẵn dữ liệu thực tế đầy đủ và không cần phải chạy lại script khởi tạo (seed).

**Lý do không thiết lập cơ sở dữ liệu và Backend chạy độc lập tại Local:**
Hệ thống có tính năng mua vé tích hợp với các cổng thanh toán trực tuyến là **VNPay** và **MoMo**. Khi giao dịch hoàn tất trên cổng thanh toán, VNPay/MoMo yêu cầu gọi một API Webhook (IPN) ngược về hệ thống để đối soát và xác nhận cập nhật trạng thái vé. 

Nếu chạy hệ thống hoàn toàn ở môi trường Local (không có ngrok hoặc domain public), Webhook từ cổng thanh toán sẽ không thể gửi request về máy của người chạy được. Vì vậy, nhóm quyết định sử dụng cấu hình kết nối trực tiếp đến hạ tầng Cloud (Database, Redis, và các services đã được deploy) để tính năng thanh toán hoạt động hoàn hảo và mượt mà nhất trong quá trình thầy cô chấm bài.

Xin cảm ơn thầy cô!
