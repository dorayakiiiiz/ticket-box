# Đặc Tả: Thanh Toán (Payment Module)

## 1. Mô Tả

Module Payment chịu trách nhiệm toàn bộ vòng đời giao dịch tài chính trong hệ thống TicketBox: tạo URL thanh toán, nhận callback webhook từ cổng thanh toán, xác minh chữ ký chống giả mạo, và kích hoạt sinh vé sau khi thanh toán thành công. Hệ thống hỗ trợ đồng thời hai phương thức thanh toán:

- **VNPAY:** Thanh toán qua cổng VNPAY (Internet Banking, ATM nội địa, QR Pay). Tạo URL bằng redirect với query params đã ký HMAC-SHA512.
- **MoMo:** Thanh toán qua ví điện tử MoMo. Tạo URL bằng cách gọi HTTP POST sang MoMo API, nhận `payUrl` trong response JSON, ký HMAC-SHA256.

Đây là module nhạy cảm nhất trong hệ thống vì liên quan trực tiếp đến tiền. Mọi thao tác cập nhật đơn hàng và sinh vé đều thực hiện trong một **TypeORM Transaction với Pessimistic Write Lock** để đảm bảo tính nguyên tử tuyệt đối.

**Các thành phần tham gia:**

| Thành phần        | File nguồn                                    | Chức năng                                                                                  |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| PaymentController | `payment/payment.controller.ts`               | 3 endpoint: create-url, vnpay-ipn, momo-ipn                                                |
| PaymentService    | `payment/payment.service.ts`                  | Tạo URL thanh toán và xử lý webhook (Transaction + Lock)                                   |
| PaymentFactory    | `payment/payment.factory.ts`                  | Factory Pattern: ánh xạ PaymentMethod → Strategy tương ứng                                 |
| VnPayStrategy     | `payment/strategies/vnpay.strategy.ts`        | Tạo URL VNPAY (HMAC-SHA512) + Circuit Breaker                                              |
| MomoStrategy      | `payment/strategies/momo.strategy.ts`         | Tạo URL MoMo (POST API, HMAC-SHA256) + Circuit Breaker                                     |
| Order Entity      | `entities/order.entity.ts`                   | Schema: orderCode, totalAmount, status (enum), paymentMethod, paymentId, idempotencyKey   |
| Ticket Entity     | `entities/ticket.entity.ts`                  | Schema: qrCode (UUID v4), status (VALID/USED/REVOKED), quan hệ với Order                   |
| CreatePaymentDto  | `payment/dto/create-payment.dto.ts`           | Validation: orderId, paymentMethod, guestName, guestEmail, guestPhone                      |

**Tổng quan kiến trúc:**

```mermaid
flowchart TB
    subgraph Client["Frontend (Next.js)"]
        FE["Web App"]
    end

    subgraph BE["NestJS Backend"]
        PC["PaymentController"]
        PS["PaymentService"]
        PF["PaymentFactory"]
        VNS["VnPayStrategy\n(Circuit Breaker)"]
        MMS["MomoStrategy\n(Circuit Breaker)"]
    end

    subgraph External["Cổng Thanh Toán"]
        VNP["VNPAY Gateway"]
        MOMO["MoMo API"]
    end

    subgraph Storage["Database"]
        DB["PostgreSQL\n(Order, Ticket, TicketType)"]
    end

    subgraph Queue["Background"]
        Q["BullMQ\nnotification-queue"]
        W["Notification Worker\n(Email)"]
    end

    FE -- "POST /payment/create-url" --> PC
    PC --> PS
    PS --> PF
    PF --> VNS
    PF --> MMS
    VNS -- "HMAC-SHA512 + redirect URL" --> VNP
    MMS -- "HTTP POST + HMAC-SHA256" --> MOMO
    VNP -- "GET /payment/vnpay-ipn (IPN)" --> PC
    MOMO -- "POST /payment/momo-ipn (IPN)" --> PC
    PC --> PS
    PS -- "Transaction + Pessimistic Lock\nOrder→PAID + Create N Tickets" --> DB
    PS -- "Job: send-ticket" --> Q
    Q --> W
```

---

## 2. Luồng Chính

### 2.1. Tạo URL Thanh Toán (VNPAY)

```mermaid
sequenceDiagram
    participant U as Người Dùng
    participant FE as Next.js Web
    participant BE as NestJS API
    participant PF as PaymentFactory
    participant VNS as VnPayStrategy
    participant CB as Circuit Breaker
    participant VNP as VNPAY Gateway
    participant DB as PostgreSQL

    U->>FE: Chọn VNPAY tại trang Checkout
    FE->>BE: POST /payment/create-url<br/>{ orderId, paymentMethod: "VNPAY",<br/>  guestName, guestEmail, guestPhone }<br/>Cookie: token=JWT

    Note over BE: JwtAuthGuard verify JWT
    BE->>DB: SELECT order WHERE id = orderId
    alt Order không tồn tại
        BE-->>FE: 404 "Không tìm thấy đơn hàng"
    else Order không ở trạng thái PENDING
        BE-->>FE: 400 "Đơn hàng không ở trạng thái chờ thanh toán"
    else Order hợp lệ (PENDING)
        BE->>DB: UPDATE order SET paymentMethod='VNPAY',<br/>guestName, guestEmail, guestPhone
        BE->>PF: getStrategy('VNPAY')
        PF-->>VNS: VnPayStrategy instance
        VNS->>CB: breaker.fire(order, ipAddress)
        Note over CB: timeout=5s, errorThreshold=50%,<br/>resetTimeout=30s
        CB->>VNS: generatePaymentUrl(order, ipAddress)
        Note over VNS: 1. Ghép vnpParams<br/>   (vnp_Amount = totalAmount × 100)<br/>2. Sắp xếp key theo alphabet<br/>3. HMAC-SHA512 với VNPay_HASH_SECRET<br/>4. Gắn vnp_SecureHash vào URL
        VNS-->>BE: paymentUrl (redirect URL VNPAY)
        BE-->>FE: 200 { paymentUrl }
        FE->>VNP: window.location.href = paymentUrl
        VNP-->>U: Hiển thị trang thanh toán VNPAY
    end
```

---

### 2.2. Tạo URL Thanh Toán (MoMo)

```mermaid
sequenceDiagram
    participant FE as Next.js Web
    participant BE as NestJS API
    participant MMS as MomoStrategy
    participant CB as Circuit Breaker
    participant MOMO as MoMo API
    participant DB as PostgreSQL

    FE->>BE: POST /payment/create-url<br/>{ orderId, paymentMethod: "MOMO",<br/>  guestName, guestEmail, guestPhone }

    BE->>DB: SELECT + UPDATE order (tương tự VNPAY)
    BE->>MMS: getStrategy('MOMO') → generatePaymentUrl

    Note over MMS: 1. Tạo requestId = uuidv4()<br/>2. Ghép rawSignature theo thứ tự<br/>   MoMo quy định (accessKey, amount,<br/>   extraData, ipnUrl, orderId, ...)<br/>3. HMAC-SHA256 với MOMO_SECRET_KEY
    MMS->>CB: breaker.fire(order, ipAddress)
    CB->>MOMO: POST sang MoMo API<br/>{ partnerCode, requestId, amount,<br/>  orderId, redirectUrl, ipnUrl,<br/>  requestType: 'payWithATM', signature }

    alt MoMo API lỗi (resultCode ≠ 0)
        MOMO-->>MMS: { resultCode: xxx, message: "..." }
        MMS-->>BE: throw Error
        BE-->>FE: 503 "MoMo thất bại"
    else MoMo thành công
        MOMO-->>MMS: { payUrl: "https://..." }
        MMS-->>BE: payUrl
        BE-->>FE: 200 { paymentUrl: payUrl }
    end
```

Điểm khác biệt giữa VNPAY và MoMo:

- **VNPAY:** Xây dựng URL hoàn toàn cục bộ từ params + hash, không gọi HTTP ra ngoài khi tạo URL. VNPAY chủ động redirect user về `VNPay_RETURN_URL` sau khi user thanh toán xong.
- **MoMo:** Phải gọi HTTP POST sang MoMo API để nhận `payUrl`, sau đó FE redirect sang URL đó. MoMo gọi IPN qua POST (không phải GET như VNPAY).
- **Thuật toán hash:** VNPAY dùng HMAC-SHA512, MoMo dùng HMAC-SHA256.
- **Số tiền:** VNPAY nhân 100 (`totalAmount * 100`), MoMo dùng nguyên số VND.

---

### 2.3. Xử Lý Webhook Thành Công (VNPAY IPN)

```mermaid
sequenceDiagram
    participant VNP as VNPAY Gateway
    participant BE as NestJS API
    participant VNS as VnPayStrategy
    participant PS as PaymentService
    participant DB as PostgreSQL
    participant Q as BullMQ Queue

    Note over VNP,BE: VNPAY gọi server-to-server sau khi khách thanh toán xong
    VNP->>BE: GET /payment/vnpay-ipn?vnp_TxnRef=ORD-xxx<br/>&vnp_ResponseCode=00&vnp_Amount=xxxx<br/>&vnp_SecureHash=xxxxxxx

    Note over BE: Endpoint @Public() — không cần JWT
    BE->>VNS: verifyWebhookSignature(queryParams)
    Note over VNS: 1. Loại bỏ vnp_SecureHash, vnp_SecureHashType<br/>2. Sắp xếp params còn lại theo alphabet<br/>3. HMAC-SHA512 → so sánh với vnp_SecureHash

    alt Chữ ký không hợp lệ (bị giả mạo)
        VNS-->>BE: false
        BE-->>VNP: 200 { RspCode: "97", Message: "Invalid Checksum" }
    else Chữ ký hợp lệ
        VNS-->>BE: true
        alt vnp_ResponseCode ≠ "00" (thanh toán thất bại)
            BE->>PS: processWebhookFailure(orderCode)
            PS->>DB: UPDATE order SET status='FAILED'
            BE-->>VNP: 200 { RspCode: "00", Message: "Payment failed acknowledged" }
        else vnp_ResponseCode = "00" (thành công)
            BE->>PS: processWebhookSuccess(orderCode, transNo, amount/100)
            PS->>DB: BEGIN TRANSACTION
            PS->>DB: SELECT order WHERE orderCode=?<br/>FOR UPDATE (Pessimistic Write Lock)

            alt Order không tồn tại
                PS-->>BE: { status: 'IGNORED', message: 'Order not found' }
            else Order đã xử lý (status ≠ PENDING)
                PS-->>BE: { status: 'IGNORED', message: 'Order already processed' }
            else Số tiền không khớp (paidAmount ≠ totalAmount)
                PS-->>BE: { status: 'IGNORED', message: 'Invalid payment amount' }
                Note over PS: [SECURITY] Chống Payment Amount Bypass
            else Hợp lệ
                PS->>DB: UPDATE order SET status='PAID', paymentId=transNo
                PS->>DB: INSERT N Tickets<br/>(qrCode = uuidv4(), status = VALID)
                PS->>DB: INCREMENT ticketType.soldQuantity += quantity
                PS->>DB: COMMIT TRANSACTION
                PS->>Q: ADD job 'send-ticket'<br/>{ channel:'EMAIL', recipient, data: { tickets } }
                PS-->>BE: { status: 'SUCCESS' }
                BE-->>VNP: 200 { RspCode: "00", Message: "Confirm Success" }
            end
        end
    end
```

---

### 2.4. Xử Lý Webhook Thành Công (MoMo IPN)

```mermaid
sequenceDiagram
    participant MOMO as MoMo Gateway
    participant BE as NestJS API
    participant MMS as MomoStrategy
    participant PS as PaymentService
    participant DB as PostgreSQL

    Note over MOMO,BE: MoMo gọi server-to-server qua POST (khác VNPAY dùng GET)
    MOMO->>BE: POST /payment/momo-ipn<br/>{ orderId, resultCode, transId,<br/>  amount, signature, ... }

    BE->>MMS: verifyWebhookSignature(body)
    Note over MMS: 1. Ghép rawSignature theo thứ tự<br/>   accessKey, amount, extraData, message,<br/>   orderId, orderInfo, orderType, partnerCode,<br/>   payType, requestId, responseTime,<br/>   resultCode, transId<br/>2. HMAC-SHA256 → so sánh signature

    alt Chữ ký không hợp lệ
        MMS-->>BE: false
        BE-->>MOMO: 400 "Invalid Signature"
    else Chữ ký hợp lệ
        alt resultCode ≠ 0 (thất bại)
            BE->>PS: processWebhookFailure(orderId)
            PS->>DB: UPDATE order SET status='FAILED'
        else resultCode = 0 (thành công)
            BE->>PS: processWebhookSuccess(orderId, transId, amount)
            Note over PS: Quy trình Transaction + Lock<br/>giống hệt VNPAY (xem 2.3)
        end
        BE-->>MOMO: 204 No Content
    end
```

Lưu ý: MoMo yêu cầu response HTTP 204 No Content (không có body), trong khi VNPAY yêu cầu response 200 với JSON `{ RspCode, Message }` theo format riêng.

---

### 2.5. Cơ Chế Bảo Vệ Giao Dịch (Transaction + Lock)

Đây là phần quan trọng nhất của toàn bộ module — được thực thi trong `processWebhookSuccess()`:

```mermaid
flowchart TD
    A["Webhook IPN đến (VNPAY hoặc MoMo)"] --> B["Xác thực chữ ký Signature"]
    B -- "Sai" --> Z1["Trả lỗi, không xử lý tiếp"]
    B -- "Đúng" --> C["queryRunner.startTransaction()"]
    C --> D["SELECT order WHERE orderCode=?\nFOR UPDATE\n(Pessimistic Write Lock)"]
    D --> E{"Order tồn tại?"}
    E -- "Không" --> Z2["ROLLBACK → IGNORED"]
    E -- "Có" --> F{"status = PENDING?"}
    F -- "Không" --> Z3["ROLLBACK → IGNORED\n(Đã xử lý rồi)"]
    F -- "Có" --> G{"paidAmount = totalAmount?"}
    G -- "Không khớp" --> Z4["ROLLBACK → IGNORED\n[SECURITY ALERT]"]
    G -- "Khớp / Không kiểm tra" --> H["Load relations:\nticketType, concert, user"]
    H --> I["UPDATE order:\nstatus = PAID\npaymentId = transactionId"]
    I --> J["Tạo N Ticket:\nqrCode = uuidv4()\nstatus = VALID"]
    J --> K["INCREMENT ticketType.soldQuantity += quantity"]
    K --> L["COMMIT"]
    L --> M["ADD job 'send-ticket'\nvào notification-queue"]
    M --> N["Trả về SUCCESS"]

    style Z1 fill:#ff6b6b
    style Z2 fill:#ff6b6b
    style Z3 fill:#ff6b6b
    style Z4 fill:#ff6b6b
    style N fill:#51cf66
```

**Tại sao cần Pessimistic Write Lock (`FOR UPDATE`)?**

VNPAY có thể retry IPN nhiều lần nếu không nhận được response hợp lệ. Nếu 2 request IPN đến đồng thời (race condition), cả 2 đều thấy Order `PENDING` và tạo vé gấp đôi. Pessimistic Lock đảm bảo chỉ một transaction được xử lý — transaction thứ 2 phải chờ transaction thứ 1 commit xong trước khi đọc lại Order, lúc đó status đã là `PAID`, nên trả về `IGNORED`.

---

## 3. Chi Tiết Kỹ Thuật

### 3.1. Strategy Pattern và Factory

```mermaid
flowchart TD
    A(["POST /payment/create-url\npaymentMethod: 'VNPAY' | 'MOMO'"])
    A --> B["PaymentFactory.getStrategy(paymentMethod)"]

    B --> C{"paymentMethod?"}
    C -- "'VNPAY'" --> D["VnPayStrategy"]
    C -- "'MOMO'"  --> E["MomoStrategy"]
    C -- "other"   --> F(["throw BadRequestException\n400 Phương thức không hợp lệ"])

    D --> G["strategy.createPaymentUrl(order, ipAddress)"]
    E --> G

    G --> H["Circuit Breaker.fire(order, ipAddress)"]
    H --> I["generatePaymentUrl() — internal"]
    I --> J(["paymentUrl"])

    style F fill:#ff6b6b,color:#fff
    style J fill:#51cf66,color:#fff
    style A fill:#339af0,color:#fff
```

Thêm cổng mới (ZaloPay, ShopeePay, ...): (1) Tạo class mới implement `PaymentStrategy`, (2) Inject vào `PaymentFactory`, (3) Thêm `case` vào `switch`. Không sửa code cũ — tuân thủ Open/Closed Principle.

### 3.2. Circuit Breaker Configuration (Opossum)

Cả hai Strategy đều bọc hàm tạo URL bằng Circuit Breaker:

| Thông số                 | Giá trị | Ý nghĩa                                         |
| ------------------------ | ------- | ----------------------------------------------- |
| `timeout`                | `5000ms` | Quá 5s không phản hồi → coi là lỗi              |
| `errorThresholdPercentage` | `50%` | 50% request lỗi → ngắt mạch (state: OPEN)       |
| `resetTimeout`           | `30000ms` | Sau 30s → thử lại (state: HALF-OPEN)           |

**Vòng đời Circuit Breaker:**

```mermaid
stateDiagram-v2
    direction LR

    [*] --> CLOSED

    CLOSED --> OPEN : lỗi tích lũy > 50%\n(errorThresholdPercentage)
    OPEN --> HALF_OPEN : sau 30s\n(resetTimeout)
    HALF_OPEN --> CLOSED : request thử nghiệm\nthành công ✓
    HALF_OPEN --> OPEN : request thử nghiệm\nthất bại ✗

    CLOSED : 🟢 CLOSED
    CLOSED : Hoạt động bình thường
    CLOSED : Mọi request đi thẳng qua

    OPEN : 🔴 OPEN
    OPEN : Mạch bị ngắt
    OPEN : Fallback ngay lập tức
    OPEN : throw ServiceUnavailableException 503

    HALF_OPEN : 🟡 HALF-OPEN
    HALF_OPEN : Cho phép 1 request thử nghiệm
    HALF_OPEN : Quyết định đóng hay mở lại
```

### 3.3. Bảng So Sánh VNPAY vs MoMo

| Tiêu chí            | VNPAY                                          | MoMo                                              |
| ------------------- | ---------------------------------------------- | ------------------------------------------------- |
| Tạo URL             | Xây dựng cục bộ (không gọi HTTP ra ngoài)      | Gọi HTTP POST sang MoMo API, nhận `payUrl`        |
| Thuật toán hash     | HMAC-SHA512                                    | HMAC-SHA256                                       |
| Sắp xếp params      | Alphabetical (bắt buộc)                        | Thứ tự cố định theo MoMo quy định                 |
| IPN Method          | GET (query params)                             | POST (JSON body)                                  |
| Đơn vị số tiền      | VND × 100 (xu)                                 | VND nguyên (không nhân)                           |
| Response IPN        | 200 JSON `{ RspCode, Message }`                | 204 No Content                                    |
| IP Address          | Bắt buộc truyền `vnp_IpAddr`                   | Không cần                                         |
| Retry IPN           | VNPAY retry nếu không nhận response hợp lệ    | Không retry (cần xử lý thành công lần đầu)        |
| Mã thành công       | `vnp_ResponseCode = "00"` (string)             | `resultCode = 0` (number)                         |



## 4. Kịch Bản Lỗi

### 4.1. Tạo URL Thanh Toán

| Kịch bản                               | HTTP  | Response                                                        |
| -------------------------------------- | ----- | --------------------------------------------------------------- |
| `orderId` không tồn tại trong DB       | 404   | `"Không tìm thấy đơn hàng {orderId}"`                           |
| Order không ở trạng thái PENDING       | 400   | `"Đơn hàng không ở trạng thái chờ thanh toán (hiện tại: PAID)"` |
| `paymentMethod` không hợp lệ          | 400   | `"paymentMethod phải là VNPAY hoặc MOMO"` (DTO validation)      |
| `orderId` bỏ trống                    | 400   | `"orderId không được để trống"` (DTO validation)                 |
| VNPAY/MoMo timeout (> 5s)             | 503   | `"Cổng thanh toán VNPAY/MoMo hiện đang quá tải..."`             |
| Circuit Breaker OPEN                   | 503   | Fallback ngay lập tức — không gọi cổng                          |
| MoMo API trả `resultCode ≠ 0`         | 500   | Re-throw error từ Strategy                                       |
| Không có JWT Cookie                    | 401   | Unauthorized (JwtAuthGuard global)                               |

### 4.2. VNPAY IPN Webhook

| Kịch bản                                    | Response cho VNPAY                              |
| ------------------------------------------- | ----------------------------------------------- |
| Chữ ký `vnp_SecureHash` sai (bị giả mạo)   | `{ RspCode: "97", Message: "Invalid Checksum" }` |
| Order không tồn tại trong DB               | `{ RspCode: "00", Message: "Order not found" }` — IGNORED |
| Order đã `PAID` (đã xử lý rồi)             | `{ RspCode: "00", Message: "Order already processed" }` |
| `paidAmount ≠ totalAmount` (hack bypass)   | `{ RspCode: "00", Message: "Invalid payment amount" }` — SECURITY ALERT |
| `vnp_ResponseCode ≠ "00"` (thất bại)       | `{ RspCode: "00", Message: "Payment failed acknowledged" }` |
| Lỗi server bất ngờ (exception)             | `{ RspCode: "99", Message: "Unknown Error" }` → VNPAY sẽ retry |

### 4.3. MoMo IPN Webhook

| Kịch bản                           | Response cho MoMo         |
| ---------------------------------- | -------------------------- |
| Chữ ký `signature` sai (giả mạo)  | 400 `"Invalid Signature"`  |
| `resultCode ≠ 0` (thất bại)        | 204 No Content             |
| `resultCode = 0` (thành công)      | 204 No Content             |
| Lỗi server bất ngờ                 | 500 Internal Server Error  |

---

## 5. Ràng Buộc

### 5.1. Bảo Mật

- **Chữ ký webhook:** Mọi IPN callback đều phải qua bước `verifyWebhookSignature()` trước khi xử lý. VNPAY dùng HMAC-SHA512 so sánh `vnp_SecureHash`, MoMo dùng HMAC-SHA256 so sánh `signature`. Nếu sai → từ chối ngay.

- **Payment Amount Bypass:** Webhook VNPAY gửi `vnp_Amount` (đơn vị xu), MoMo gửi `amount` (đơn vị VND). Backend chia 100 (VNPAY) rồi so sánh với `order.totalAmount`. Nếu khác → từ chối, log `[SECURITY ALERT]`. Mục đích: ngăn hacker sửa số tiền trong payload webhook thành 100đ để lấy vé miễn phí.

- **Pessimistic Write Lock:** `SELECT ... FOR UPDATE` trên bảng Order ngăn chặn 2 webhook IPN đến đồng thời tạo vé gấp đôi (race condition).

- **Endpoint webhook là @Public():** Cổng thanh toán gọi server-to-server không có JWT. Tuy nhiên, bảo mật được đảm bảo hoàn toàn bởi xác thực chữ ký — không ai giả danh VNPAY/MoMo được nếu không có HASH_SECRET/SECRET_KEY.

### 5.2. Hiệu Năng

- **Circuit Breaker** bảo vệ hệ thống khi cổng thanh toán quá tải: timeout 5s, ngắt mạch khi 50% lỗi, phục hồi sau 30s. Ngăn hàng đợi request bị tắc nghẽn khi cổng có vấn đề.

- **Gửi email bất đồng bộ:** Sau khi commit transaction thành công, job gửi email vé được đẩy vào BullMQ — không làm chậm webhook response. VNPAY cần response nhanh để không retry.

- **Không load relations khi lock:** `findOne(Order, { where: { orderCode }, lock: { mode: 'pessimistic_write' } })` không dùng `relations` — câu SQL sạch `SELECT ... FOR UPDATE`. Relations được load riêng sau khi đã lock thành công để tránh deadlock.

### 5.3. Tính Toàn Vẹn Dữ Liệu

- **Atomic transaction:** Order→PAID + Insert N Tickets + INCREMENT soldQuantity xảy ra trong cùng một transaction. Nếu bất kỳ bước nào lỗi → rollback toàn bộ → DB không bao giờ ở trạng thái nửa vời.

- **Idempotency:** Nếu VNPAY retry IPN lần 2, Order đã `PAID` → trả về `IGNORED` mà không tạo vé thêm.

- **qrCode là UUID v4:** Đảm bảo tính ngẫu nhiên và duy nhất toàn cầu — không thể đoán/brute-force.

---

## 6. Quyết Định Thiết Kế

### 6.1. Tại sao dùng Pessimistic Lock thay vì Optimistic Lock?

| Tiêu chí          | Optimistic Lock (`@Version`)          | Pessimistic Lock (`FOR UPDATE`)           |
| ----------------- | ------------------------------------- | ----------------------------------------- |
| Cơ chế            | Check version khi commit, retry nếu conflict | Block row ngay từ khi đọc               |
| Phù hợp           | Xung đột hiếm (đọc nhiều, ghi ít)    | Xung đột có thể xảy ra (webhook retry)   |
| Performance       | Tốt hơn (không block)                 | Kém hơn (block)                           |
| Độ an toàn        | Có thể miss nếu không retry đúng cách | Đảm bảo tuyệt đối chỉ 1 transaction thắng |

**Quyết định:** Pessimistic Lock.

**Lý do:** Webhook IPN liên quan đến tiền — không chấp nhận bất kỳ rủi ro nào. VNPAY retry nhiều lần, scenario 2 request đến gần như đồng thời là hoàn toàn có thể xảy ra. Optimistic Lock cần code retry phức tạp và vẫn có khả năng miss. Pessimistic Lock đơn giản, chắc chắn, đánh đổi một chút performance nhưng đảm bảo tuyệt đối không sinh vé gấp đôi.

### 6.2. Tại sao dùng Strategy Pattern cho thanh toán?

| Tiêu chí            | If/else trong Service                  | Strategy Pattern                        |
| ------------------- | -------------------------------------- | --------------------------------------- |
| Thêm cổng mới       | Sửa PaymentService (vi phạm OCP)       | Tạo class mới + register vào Factory   |
| Test                | Khó mock riêng từng cổng              | Dễ mock từng Strategy độc lập          |
| Độ phức tạp         | Thấp ban đầu                           | Cao hơn ban đầu                         |
| Bảo trì dài hạn     | Code Service phình to                  | Mỗi cổng là 1 file độc lập             |

**Quyết định:** Strategy Pattern + Factory.

**Lý do:** VNPAY và MoMo có flow tạo URL hoàn toàn khác nhau (cách ghép params, hash algorithm, gọi HTTP hay không). Nhét tất cả vào 1 service sẽ tạo ra code khó maintain. Strategy Pattern tách biệt hoàn toàn — thêm ZaloPay sau này chỉ cần tạo `zaloPay.strategy.ts`, không động vào code hiện tại.

### 6.3. Tại sao reload relations sau khi lock thay vì join ngay từ đầu?

Câu `SELECT ... FOR UPDATE` trong TypeORM **không hỗ trợ relations** — nếu thêm `relations` vào findOne với lock mode, TypeORM sẽ sinh câu SQL có `LEFT JOIN` khiến `FOR UPDATE` có thể không lock đúng row, hoặc sinh deadlock khi nhiều relations bị lock cùng lúc. Giải pháp: lock Order trước bằng câu SELECT sạch, sau khi đã giữ lock thì mới `findOneOrFail` lấy relations bổ sung.

---

## 7. Tiêu Chí Chấp Nhận

| #   | Hành vi                                                          | Kết quả mong đợi                                                                                        |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | POST /payment/create-url với VNPAY hợp lệ                        | Trả về `paymentUrl` bắt đầu bằng `https://sandbox.vnpayment.vn/...`                                    |
| 2   | POST /payment/create-url với MoMo hợp lệ                         | Gọi MoMo API thành công, trả về `paymentUrl` từ MoMo                                                   |
| 3   | POST /payment/create-url với Order đã PAID                       | 400 "Đơn hàng không ở trạng thái chờ thanh toán"                                                       |
| 4   | POST /payment/create-url không có JWT Cookie                     | 401 Unauthorized                                                                                        |
| 5   | POST /payment/create-url với `paymentMethod = "ZALOPAY"`         | 400 "paymentMethod phải là VNPAY hoặc MOMO"                                                             |
| 6   | VNPAY IPN với chữ ký hợp lệ + `responseCode=00`                 | Order → PAID, sinh N Ticket (qrCode = UUID), soldQuantity tăng, gửi email vé qua queue                 |
| 7   | VNPAY IPN với chữ ký bị sửa đổi                                  | Response `{ RspCode: "97" }`, Order không thay đổi                                                      |
| 8   | VNPAY IPN với `paidAmount ≠ totalAmount`                         | Response IGNORED, log `[SECURITY ALERT]`, Order không thay đổi                                          |
| 9   | VNPAY IPN gọi 2 lần cho cùng 1 Order (retry)                    | Lần đầu SUCCESS, lần 2 IGNORED — không sinh vé gấp đôi                                                 |
| 10  | MoMo IPN với `resultCode=0`                                      | Order → PAID, sinh N Ticket, response 204                                                               |
| 11  | MoMo IPN với `resultCode≠0`                                      | Order → FAILED, response 204                                                                            |
| 12  | MoMo IPN với chữ ký sai                                          | 400 "Invalid Signature"                                                                                  |
| 13  | VNPAY/MoMo quá tải (timeout 5s liên tục 50% request)             | Circuit Breaker OPEN → 503 ngay lập tức                                                                 |
| 14  | Circuit Breaker OPEN → sau 30s                                   | HALF-OPEN → thử request tiếp theo → nếu thành công thì CLOSED                                          |
| 15  | Số ticket sinh ra = order.quantity                               | Đúng số vé, mỗi vé có `qrCode` duy nhất (UUID v4)                                                      |
| 16  | 2 webhook IPN đến đồng thời (concurrent)                         | Chỉ đúng 1 lần xử lý thành công (Pessimistic Lock), lần còn lại IGNORED                                |
| 17  | Kiểm tra DB sau khi Order PAID                                   | `order.status = PAID`, `order.paymentId` có giá trị, `ticketType.soldQuantity` tăng đúng `quantity`    |
| 18  | Email vé được gửi sau khi thanh toán thành công                  | Job `send-ticket` xuất hiện trong notification-queue, worker gửi email với thông tin vé                 |
