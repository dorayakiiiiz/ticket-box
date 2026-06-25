# Tài Liệu Triển Khai: Xử Lý Khách Mời VIP & Soát Vé Offline

Tài liệu này tổng hợp thiết kế luồng xử lý dành cho Khách mời VIP (Sponsor) và cập nhật cơ chế đồng bộ dữ liệu soát vé Offline, làm cơ sở để lập trình viên Backend và Mobile App triển khai (Implement).

> [!NOTE]
> Bảng `Guest` được thiết kế tách biệt hoàn toàn với bảng `User`. Khách VIP không đi qua cổng thanh toán, không cần tạo tài khoản hệ thống (tránh việc quản lý rác OTP, mật khẩu cho hàng ngàn email khách mời). Bảng `Guest` chỉ có quan hệ `ManyToOne` trực tiếp với `Concert`.

## 1. Luồng Hoạt Động Của Khách Mời VIP (Sponsor Guests)

### A. Cơ Chế Lưu Trữ & Sinh Mã
- Nhãn hàng (Sponsor) cung cấp danh sách hàng ngàn khách mời (Tên, Email, SĐT) bằng file CSV.
- Hệ thống tiếp nhận, lưu vào bảng `Guest` và tự động sinh một mã duy nhất gọi là `guestCode` (Ví dụ: `VIP-A1B2C3`) cho mỗi người.
- Dựa trên `guestCode` này, Backend sẽ dùng thư viện tạo ra mã QR Code riêng biệt. Mã QR này được đính kèm vào Email/Zalo gửi hàng loạt cho khách mời.

### B. Khu Vực & Check-in Tại Sự Kiện
- **Khu vực (Zone):** Khách mời thường đứng/ngồi chung ở khu vực VIP Lounge hoặc Fanzone riêng do nhãn hàng bố trí (không có số ghế cụ thể trên hệ thống vé).
- **Soát vé (Check-in):** Tại SVĐ sẽ có **Lối Đi VIP (Sponsor Gate)**. Khách đưa mã QR ra, nhân viên (Staff) dùng Mobile App để quét.
- App quét ra chuỗi `guestCode`, đối chiếu với dữ liệu nội bộ trong điện thoại (SQLite). Nếu khớp và cờ `isCheckedIn` đang là `false` -> Báo xanh lá -> Cập nhật `isCheckedIn = true` -> Mời vào.

## 2. Kỹ Thuật Code: Import CSV Chống Tràn RAM (OOM)

Khi Import file CSV lên tới 10.000 hoặc 100.000 dòng, tuyệt đối không dùng `fs.readFileSync` để đọc toàn bộ file lên RAM. Node.js sẽ bị quá tải (Out of Memory) và sập Server.

> [!IMPORTANT]
> **Giải pháp:** Sử dụng Stream (Luồng) kết hợp Batching (Gom nhóm) và Bulk Upsert (Cập nhật hàng loạt).

### Mã Code Mẫu (NestJS / TypeORM)

Sử dụng thư viện `csv-parser` để đọc từng dòng. Cứ gom đủ 500 dòng thì đẩy 1 câu lệnh `INSERT ... ON CONFLICT` xuống Database.

```typescript
import * as csv from 'csv-parser';
import * as fs from 'fs';

async function importGuestsFromCSV(filePath: string, concertId: string) {
  const batchData = [];
  const BATCH_SIZE = 500;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => {
      // 1. Chuẩn hóa dữ liệu từng dòng
      const guest = {
        fullName: row.name,
        email: row.email,
        phone: row.phone,
        guestCode: generateUniqueVIPCode(), // Hàm tự viết sinh mã
        concert: { id: concertId }
      };
      batchData.push(guest);

      //  Gom đủ batch thì Bulk Insert
      if (batchData.length >= BATCH_SIZE) {
        const dataToInsert = [...batchData];
        batchData.length = 0; // Xóa sạch mảng hiện tại

        // Dùng orUpdate để nếu lỡ import lại file cũ không bị lỗi trùng lặp (dựa trên email)
        await this.guestRepository.createQueryBuilder()
          .insert()
          .into(Guest)
          .values(dataToInsert)
          .orUpdate(['fullName', 'phone'], ['email']) 
          .execute();
      }
    })
    .on('end', async () => {
      // 3. Xử lý nốt phần dữ liệu lẻ tẻ còn sót lại cuối file
      if (batchData.length > 0) {
        await this.guestRepository.createQueryBuilder()
          .insert()
          .into(Guest)
          .values(batchData)
          .orUpdate(['fullName', 'phone'], ['email'])
          .execute();
      }
      console.log('Import danh sách VIP thành công!');
    });
}
```

## 3. Cập Nhật Payload Đồng Bộ Soát Vé Offline (Sync Data)

Để App Flutter ngoài thực địa hoạt động chính xác nhất khi mất kết nối 4G/5G, API `/sync/tickets` và `/sync/guests` cần bổ sung một số trường quan trọng.

### Đối Với Vé Thường (Regular Tickets)
> [!WARNING]
> Nếu chỉ đồng bộ `qr_payload` và `status` (như spec cũ), Staff sẽ không biết khách thuộc khu vực nào (Zone). Khách mua vé GA có thể cố tình đi lọt sang Cổng VIP.

**Cần tải thêm các trường:**
- `zone_name`: Tên khu vực (Ví dụ: CAT 1, SVIP, GA).
- `ticket_type_name`: Phân loại vé.

Khi quét mã, App sẽ hiện to dòng chữ **Khu vực: GA - Cổng C**. Nếu khách đứng sai cổng, Staff sẽ chỉ đường cho khách đi sang cổng khác.

### Đối Với Khách Mời (Guests)
> [!TIP]
> Rất nhiều khách VIP là người lớn tuổi, họ không rành mở QR Code trên email, hoặc điện thoại hết pin. App soát vé cần có tính năng "Tìm kiếm thủ công".

**Cần tải thêm các trường:**
- `guestCode` (dùng làm chuỗi QR payload).
- `fullName`
- `email`
- `phone`
- `isCheckedIn`

Khi khách mất mã QR, Staff có thể gõ số điện thoại hoặc Tên vào ô Search trên App, hệ thống truy vấn vào bảng `guests` (SQLite local), đối chiếu CCCD/CMND của khách, và bấm nút Check-in thủ công ngay trên màn hình.
