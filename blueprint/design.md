# TicketBox — Technical Design

> **Lưu ý:** Tài liệu này chứa các sơ đồ Mermaid. Để hiển thị đúng trong VS Code, hãy cài extension **Markdown Preview Mermaid Support** từ Marketplace.

---

## 1. Kiến Trúc Tổng Thể

### Phong Cách Kiến Trúc: Modular Monolith

TicketBox áp dụng kiến trúc **Modular Monolith** cho backend — tức là hệ thống chạy trên một tiến trình (process) duy nhất nhưng được tổ chức thành các module nghiệp vụ tách biệt (Auth, Concert, Booking, Payment, Notification, Ticket, Guest).

**Lý do không dùng Microservices:**

| Tiêu chí | Microservices | Modular Monolith (TicketBox) |
|---|---|---|
| Team size | 20+ engineers | 4 sinh viên |
| Độ phức tạp vận hành | Cao (service mesh, distributed tracing) | Thấp (1 server, 1 deploy) |
| Network latency | Cao (gọi HTTP giữa các service) | Gần bằng 0 (in-process call) |
| Khả năng scale | Từng service độc lập | Scale toàn bộ horizontally |
| Phù hợp | Hệ thống đã ổn định, rõ bounded context | Giai đoạn phát triển, còn thay đổi nhanh |

**Lý do không dùng Monolith thuần:**
Codebase được chia module theo nghiệp vụ (mỗi module có Controller, Service, DTO riêng), giúp dễ dàng tách ra Microservice sau này nếu cần scale từng phần.

### Các Thành Phần Chính

```
┌─────────────────────────────────────────────────────────────────┐
│                     TICKETBOX SYSTEM                            │
│                                                                 │
│  ┌─────────────────┐    ┌───────────────────────────────────┐   │
│  │  Next.js Web     │    │        NestJS Backend API         │   │
│  │  (Vercel)        │    │           (Render)                │   │
│  │                 │    │                                   │   │
│  │ • SSR/ISR pages │    │ Modules: Auth, Concert, Booking,  │   │
│  │ • SWR polling   │    │ Payment, Ticket, Notification,    │   │
│  │ • Admin panel   │    │ Guest, Admin                      │   │
│  └────────┬────────┘    └──────────┬────────────────────────┘   │
│           │                        │                             │
│           │      REST API (JSON)   │                             │
│           └────────────────────────┘                             │
│                                                                 │
│  ┌─────────────────┐    ┌──────────────┐   ┌─────────────────┐  │
│  │  Flutter Mobile  │    │  PostgreSQL  │   │     Redis       │  │
│  │  (Soát vé)       │    │  (Render)    │   │  (Upstash/      │  │
│  │                 │    │              │   │   Render)       │  │
│  │ • Offline-first │    │ 7 entities   │   │ • Cache vé      │  │
│  │ • SQLite local  │    │ ACID trans   │   │ • Rate limit    │  │
│  │ • QR scanner    │    │ Soft delete  │   │ • BullMQ        │  │
│  └─────────────────┘    └──────────────┘   └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Hạ Tầng Triển Khai Thực Tế

| Thành phần | Nền tảng | Ghi chú |
|---|---|---|
| **Frontend Web** | Vercel | Auto-deploy từ Git, Edge Network toàn cầu |
| **Backend API** | Render | Containerized NestJS, port 8080 |
| **PostgreSQL** | Supabase | Tự động backup, SSL |
| **Redis** | Redis Cloud | Connection pool với ioredis |
| **Flutter App** | APK build | Chạy trên Android thiết bị staff |

---

## 2. C4 Diagram

### Level 1 — System Context

Sơ đồ này trả lời câu hỏi: **TicketBox tồn tại trong bức tranh nào?**

```mermaid
C4Context
    title System Context — TicketBox

    Person(audience, "Khán Giả", "Xem concert, mua vé, nhận e-ticket, check-in tại cổng")
    Person(organizer, "Ban Tổ Chức", "Tạo concert, cấu hình vé, xem thống kê doanh thu, upload AI bio")
    Person(staff, "Nhân Sự Soát Vé", "Xác nhận vé tại cổng bằng mobile app, hoạt động offline")

    System(ticketbox, "TicketBox", "Nền tảng bán vé concert: mua vé, thanh toán, soát vé, quản trị")

    System_Ext(vnpay, "VNPAY Sandbox", "Cổng thanh toán — xử lý giao dịch thẻ ngân hàng")
    System_Ext(momo, "MoMo Sandbox", "Cổng thanh toán — ví điện tử MoMo")
    System_Ext(gemini, "Google Gemini API", "AI model — sinh tóm tắt nghệ sĩ từ PDF press kit")
    System_Ext(brevo, "Brevo (Email)", "Dịch vụ gửi email xác nhận vé và nhắc nhở sự kiện")
    System_Ext(cloudflare, "Cloudflare Turnstile", "CAPTCHA vô hình — phân biệt người thật và bot")
    System_Ext(google_oauth, "Google OAuth", "Đăng nhập bằng tài khoản Google")
    System_Ext(csv_brand, "Nhãn Hàng Tài Trợ", "Gửi file CSV danh sách khách mời VIP qua email mỗi đêm")

    Rel(audience, ticketbox, "Dùng Web App", "HTTPS")
    Rel(organizer, ticketbox, "Dùng Admin Panel", "HTTPS")
    Rel(staff, ticketbox, "Dùng Mobile App", "HTTPS / Offline SQLite")

    Rel(ticketbox, vnpay, "Tạo URL thanh toán + nhận IPN webhook", "HTTPS")
    Rel(ticketbox, momo, "Tạo URL thanh toán + nhận IPN webhook", "HTTPS")
    Rel(ticketbox, gemini, "Gửi text từ PDF → nhận tóm tắt nghệ sĩ", "HTTPS / API Key")
    Rel(ticketbox, brevo, "Gửi email xác nhận vé và nhắc nhở", "HTTPS / SMTP")
    Rel(ticketbox, cloudflare, "Xác thực CAPTCHA token", "HTTPS")
    Rel(ticketbox, google_oauth, "Xác thực OAuth token từ Supabase", "HTTPS")
    Rel(csv_brand, ticketbox, "Upload CSV khách mời qua Admin panel", "Manual")
```

---

### Level 2 — Container

Sơ đồ này trả lời: **TicketBox gồm những container nào, chúng dùng công nghệ gì và giao tiếp ra sao?**

```mermaid
C4Container
    title Container Diagram — TicketBox

    Person(audience, "Khán Giả")
    Person(organizer, "Ban Tổ Chức")
    Person(staff, "Nhân Sự Soát Vé")

    Container(webapp, "Web Application", "Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, SWR", "Giao diện mua vé và admin panel. Chạy trên Vercel.")

    Container(mobile, "Mobile App", "Flutter (Dart), SQLite (sqflite), mobile_scanner", "App soát vé offline-first. Chạy trên Android.")

    Container(api, "Backend API", "NestJS, TypeScript, TypeORM", "REST API xử lý toàn bộ nghiệp vụ. Chạy trên Render.")

    ContainerDb(postgres, "PostgreSQL", "PostgreSQL 15", "Lưu trữ dữ liệu chính: users, concerts, orders, tickets...")

    ContainerDb(redis, "Redis", "Redis (ioredis)", "Multi-purpose: Cache vé, BullMQ Job Queue, Rate Limit, Distributed Lock, Idempotency")

    System_Ext(vnpay, "VNPAY")
    System_Ext(momo, "MoMo")
    System_Ext(gemini, "Gemini AI")
    System_Ext(brevo, "Brevo Email")
    System_Ext(cloudflare, "Cloudflare Turnstile")

    Rel(audience, webapp, "Xem concert, mua vé", "HTTPS")
    Rel(organizer, webapp, "Quản lý concert, upload AI bio", "HTTPS")
    Rel(staff, mobile, "Đăng nhập, sync vé, quét QR", "HTTPS / Offline")

    Rel(webapp, api, "REST API calls", "JSON over HTTPS, HttpOnly Cookie (JWT)")
    Rel(mobile, api, "REST API calls", "JSON over HTTPS, Bearer Token (JWT)")

    Rel(api, postgres, "CRUD entities", "TypeORM, TCP 5432")
    Rel(api, redis, "Cache + Queue + Lock", "ioredis, TCP 6379")

    Rel(api, vnpay, "Create payment URL + verify IPN", "HTTPS")
    Rel(api, momo, "Create payment URL + verify IPN", "HTTPS")
    Rel(api, gemini, "Summarize PDF text", "HTTPS / REST")
    Rel(api, brevo, "Send transactional emails", "HTTPS / SMTP")
    Rel(api, cloudflare, "Verify CAPTCHA token", "HTTPS")
```

---

## 3. High-Level Architecture Diagram

Sơ đồ này trả lời: **Dữ liệu chạy như thế nào qua các thành phần, đặc biệt tại các điểm tích hợp?**

```mermaid
flowchart TB
    subgraph CLIENT["Client Layer"]
        FE["Next.js Web App\n(Vercel)"]
        MOB["Flutter Mobile\n(Android)"]
    end

    subgraph BACKEND["Backend Layer — NestJS (Render)"]
        direction TB
        subgraph GUARDS["Guard Chain (mọi request đều qua)"]
            G1["JwtAuthGuard\n(Global)"]
            G2["RolesGuard\n(Global)"]
            G3["ThrottlerGuard\n(Redis-backed)"]
            G4["CaptchaGuard\n(Cloudflare Turnstile)"]
            G5["IdempotencyGuard\n(Redis SET NX)"]
        end

        subgraph MODULES["Business Modules"]
            AUTH["AuthModule\n/auth/*"]
            CONCERT["ConcertModule\n/concerts/*"]
            BOOKING["BookingModule\n/booking/*"]
            PAYMENT["PaymentModule\n/payment/*"]
            TICKET["TicketModule\n/ticket/*"]
            NOTIF["NotificationModule"]
            GUEST["GuestModule\n/guest/*"]
        end

        subgraph WORKERS["Background Workers (BullMQ)"]
            W1["OrderProcessor\nticketbox.order"]
            W2["AiBioProcessor\nticketbox.concert.ai-bio"]
            W3["SyncCheckinProcessor\nticketbox.sync-checkins"]
            W4["NotificationProcessor\nnotification-queue"]
        end

        subgraph CRONS["Scheduled Jobs (@nestjs/schedule)"]
            C1["handleExpiredOrders\nMỗi 5 phút"]
            C2["handleEventReminders\nMỗi 30 phút"]
            C3["updateConcertStatuses\nMỗi ngày"]
        end
    end

    subgraph DATA["Data Layer"]
        PG[("PostgreSQL\n7 entities")]
        REDIS[("Redis\nCache + Queue")]
    end

    subgraph EXTERNAL["External Services"]
        VNPAY["VNPAY\n(Circuit Breaker)"]
        MOMO["MoMo\n(Circuit Breaker)"]
        GEMINI["Google Gemini AI\n(+ Groq fallback)"]
        BREVO["Brevo\n(Email)"]
        CF["Cloudflare\nTurnstile"]
    end

    FE -- "REST API (JSON)\nHttpOnly Cookie JWT" --> GUARDS
    MOB -- "REST API (JSON)\nBearer Token JWT" --> GUARDS
    GUARDS --> MODULES

    BOOKING -- "Lua Script atomic\nDECRBY vé" --> REDIS
    BOOKING -- "Add job" --> REDIS
    W1 -- "Tạo Order (PENDING)" --> PG
    W2 -- "Summarize PDF" --> GEMINI
    W2 -- "Update aiBio" --> PG
    W3 -- "Update CHECKED_IN" --> PG
    W4 -- "Gửi email xác nhận vé" --> BREVO
    
    CONCERT -- "Read/Write" --> PG
    CONCERT -- "SET NX warm-up\nGET availability" --> REDIS
    AUTH -- "JWT HttpOnly Cookie" --> FE
    
    PAYMENT -- "Create URL\n(opossum Circuit Breaker)" --> VNPAY
    PAYMENT -- "Create URL\n(opossum Circuit Breaker)" --> MOMO
    VNPAY -- "IPN Webhook GET /vnpay-ipn\nHMAC-SHA512 verified" --> PAYMENT
    MOMO -- "IPN Webhook POST /momo-ipn\nHMAC-SHA256 verified" --> PAYMENT
    PAYMENT -- "Pessimistic Lock\nTạo Ticket + QR code" --> PG
    PAYMENT -- "Add job → email vé" --> NOTIF

    C1 -- "Distributed Lock\n(Redis SET NX)" --> REDIS
    C1 -- "Cancel PENDING\n> 15 phút" --> PG
    C1 -- "Rollback vé" --> REDIS
    C2 -- "Distributed Lock" --> REDIS
    C2 -- "Add reminder job" --> NOTIF
    C3 -- "Update status" --> PG

    CF -- "Verify token" --> BACKEND
    MODULES --> PG
    MODULES --> REDIS
```

---

## 4. Thiết Kế Cơ Sở Dữ Liệu

### 4.1 Lựa Chọn Công Nghệ Database

#### PostgreSQL — RDBMS chính (Transactional Data)

**Lý do chọn:**
- **ACID compliance:** Đảm bảo tính toàn vẹn tuyệt đối cho dữ liệu tài chính (Order, Ticket). Không thể dùng NoSQL với giao dịch mua vé — một vé phải đồng thời được tạo và số lượng bán phải được cập nhật trong cùng một transaction.
- **Pessimistic Locking (`SELECT FOR UPDATE`):** Cần thiết cho Webhook IPN để đảm bảo VNPAY gọi nhiều lần không tạo ticket trùng.
- **Foreign Key constraints:** Đảm bảo integrity giữa Order, Ticket, Concert, User.
- **Soft Delete (`@DeleteDateColumn`):** Dữ liệu tài chính không được xóa cứng.

#### Redis — In-Memory Store (Operational Data)

**Lý do chọn:**
- **Atomic operations:** Lua Script chạy single-threaded, không có race condition — không thể thay bằng PostgreSQL vì latency quá cao.
- **TTL nội trang:** Idempotency key, job result, distributed lock đều có thời gian sống tự nhiên — không cần cron xóa rác.
- **BullMQ:** Chạy trên Redis, tận dụng infrastructure có sẵn, không cần setup RabbitMQ/Kafka.
- **Sub-millisecond latency:** Đọc số vé từ Redis < 1ms vs 5-20ms từ PostgreSQL.

---

### 4.2 Schema PostgreSQL

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string password "nullable — null nếu đăng nhập Google"
        string fullName "nullable"
        string phone "nullable"
        enum role "AUDIENCE | ORGANIZER | STAFF"
        boolean isVerified
        timestamp deletedAt "Soft delete"
        timestamp createdAt
        timestamp updatedAt
    }

    concerts {
        uuid id PK
        string name
        string subtitle "nullable"
        text description
        string venue
        string city
        timestamp date
        timestamp openTime
        string coverImageUrl "nullable"
        enum status "UPCOMING | ONGOING | COMPLETED | CANCELLED"
        string aiStatus "IDLE | PROCESSING | DONE | FAILED"
        boolean isReminded "Đã gửi reminder email chưa"
        timestamp deletedAt "Soft delete"
        timestamp createdAt
        timestamp updatedAt
    }

    ticket_types {
        uuid id PK
        string name "SVIP | VIP | CAT1 | CAT2 | GA"
        decimal price
        int totalQuantity
        int soldQuantity "Tăng sau khi PAID — chốt sale"
        int maxPerUser "default 2"
        string colorCode "Màu hiển thị trên sơ đồ"
        uuid concert_id FK
        timestamp createdAt
        timestamp updatedAt
    }

    orders {
        uuid id PK
        string orderCode UK "ORD-XXXX — gửi sang VNPAY/MoMo"
        decimal totalAmount
        enum status "PENDING | PAID | CANCELLED | FAILED"
        enum paymentMethod "VNPAY | MOMO — nullable"
        string paymentId "Transaction ID từ cổng thanh toán — nullable"
        string idempotencyKey UK "UUID từ FE — nullable"
        int quantity
        boolean isRefundedToRedis "Đã hoàn vé Redis chưa (self-healing)"
        string guestName "nullable"
        string guestEmail "nullable"
        string guestPhone "nullable"
        uuid user_id FK
        uuid concert_id FK
        uuid ticketType_id FK
        timestamp createdAt
        timestamp updatedAt
    }

    tickets {
        uuid id PK
        string qrCode UK "UUID v4 — mã QR quét tại cổng"
        enum status "VALID | USED | REVOKED"
        uuid order_id FK "CASCADE DELETE"
        timestamp createdAt
        timestamp updatedAt
    }

    otps {
        uuid id PK
        string email
        string code "6 chữ số"
        timestamp expiresAt
        timestamp createdAt
    }

    guests {
        uuid id PK
        string fullName
        string email "nullable"
        string phone "nullable"
        string guestCode UK "Mã định danh từ CSV nhãn hàng"
        boolean isCheckedIn
        uuid concert_id FK "CASCADE DELETE"
        timestamp createdAt
        timestamp updatedAt
    }

    users ||--o{ orders : "1 user có nhiều orders"
    concerts ||--o{ ticket_types : "1 concert có nhiều loại vé"
    concerts ||--o{ orders : "1 concert có nhiều orders"
    concerts ||--o{ guests : "1 concert có nhiều khách mời VIP"
    ticket_types ||--o{ orders : "1 loại vé có nhiều orders"
    orders ||--o{ tickets : "1 order có nhiều tickets (= số lượng mua)"
```

---

### 4.3 Redis Key Patterns

| Key Pattern | Kiểu dữ liệu | TTL | Mục đích |
|---|---|---|---|
| `ticket_type:{id}:available` | String (số nguyên) | Không hết hạn | Số vé còn lại — engine đặt vé |
| `user:{id}:ticket_type:{id}:tickets_held` | String (số nguyên) | Không hết hạn | Số vé user đã giữ — giới hạn per-user |
| `idempotency:{UUID}` | String (`'processing'`) | 3600s (1 giờ) | Chặn double-click |
| `job_result:{idempotencyKey}` | String (orderId hoặc `'FAILED'`) | 3600s (1 giờ) | FE polling kết quả booking |
| `cronjob:lock:handleExpiredOrders` | String (`'locked'`) | 240s (4 phút) | Distributed lock cho cron hủy đơn |
| `cronjob:lock:sendEventReminders` | String (`'locked'`) | 1200s (20 phút) | Distributed lock cho cron nhắc nhở |
| `throttler:{IP/userID}` | Hash | 1000ms | Rate limit counter |
| `bull:{queueName}:*` | List/Hash/Set | BullMQ managed | Job queue internal state |

---

### 4.4 Database Indexes

Hai index đã được đánh trong codebase để tối ưu Cronjob queries:

```typescript
// Trên bảng orders — phục vụ Cronjob quét đơn PENDING hết hạn
@Index(['status', 'createdAt'])
export class Order { ... }

// Trên bảng concerts — phục vụ Cronjob gửi nhắc nhở 24h
@Index(['status', 'isReminded', 'date'])
export class Concert { ... }
```

**Tại sao cần index?** Khi hệ thống tích lũy hàng triệu đơn hàng, query không có index buộc PostgreSQL phải Full Table Scan → CPU database lên 100% mỗi 5 phút → toàn bộ API chậm lại (latency tăng vọt).

---

## 5. Thiết Kế Kiểm Soát Truy Cập (RBAC)

### 5.1 Mô Hình Phân Quyền

TicketBox áp dụng **Role-Based Access Control (RBAC)** với 3 role cứng được lưu trong cột `role` của bảng `users`:

| Role | Mô tả | Đối tượng |
|---|---|---|
| `AUDIENCE` | Khán giả thông thường — mua vé, xem vé đã mua | Default cho mọi user mới đăng ký |
| `ORGANIZER` | Ban tổ chức — toàn quyền quản lý concert | Tài khoản được cấp thủ công |
| `STAFF` | Nhân sự soát vé — chỉ được dùng Mobile App | Tài khoản được cấp thủ công |

### 5.2 Cơ Chế Kỹ Thuật

**Lớp 1: JwtAuthGuard (Global Guard)**

```typescript
// app.module.ts — áp dụng cho TOÀN BỘ endpoint
{ provide: APP_GUARD, useClass: JwtAuthGuard }
```

- Đọc JWT từ **HttpOnly Cookie** (`token`) hoặc **Authorization: Bearer** header
- Verify signature với `JWT_SECRET`
- Gắn `{ id, email, role }` vào `req.user`
- Endpoint muốn public phải dùng decorator `@Public()`

**Lớp 2: RolesGuard (Global Guard)**

```typescript
// app.module.ts — áp dụng cho TOÀN BỘ endpoint
{ provide: APP_GUARD, useClass: RolesGuard }
```

- Đọc metadata `@Roles(UserRole.ORGANIZER)` từ Controller/Handler
- So sánh `req.user.role` với role được yêu cầu
- Nếu role không đủ → HTTP 403 Forbidden

### 5.3 Bảng Phân Quyền API

| Endpoint | AUDIENCE | ORGANIZER | STAFF | Public |
|---|:---:|:---:|:---:|:---:|
| `GET /concerts` | ✅ | ✅ | ✅ | ✅ |
| `GET /concerts/:id` | ✅ | ✅ | ✅ | ✅ |
| `GET /concerts/:id/availability` | ✅ | ✅ | ✅ | ✅ |
| `POST /concerts` | ❌ | ✅ | ❌ | ❌ |
| `PUT /concerts/:id` | ❌ | ✅ | ❌ | ❌ |
| `DELETE /concerts/:id` | ❌ | ✅ | ❌ | ❌ |
| `POST /concerts/:id/upload-bio` | ❌ | ✅ | ❌ | ❌ |
| `POST /booking` | ✅ | ❌ | ❌ | ❌ |
| `GET /booking/status` | ✅ | ✅ | ✅ | ❌ |
| `POST /payment/create-url` | ✅ | ❌ | ❌ | ❌ |
| `GET /payment/vnpay-ipn` | — | — | — | ✅ (VNPAY server) |
| `POST /payment/momo-ipn` | — | — | — | ✅ (MoMo server) |
| `GET /ticket/my-tickets` | ✅ | ❌ | ❌ | ❌ |
| `POST /ticket/batch-sync` | ❌ | ❌ | ✅ | ❌ |
| `GET /ticket/download` | ❌ | ❌ | ✅ | ❌ |
| `GET /guest` | ❌ | ✅ | ✅ | ❌ |
| `POST /guest/import-csv` | ❌ | ✅ | ❌ | ❌ |

### 5.4 Luồng Xác Thực

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Next.js Web
    participant BE as NestJS API
    participant R as Redis
    participant DB as PostgreSQL

    Note over U,DB: Luồng Đăng Ký
    U->>FE: Nhập email + password + fullName
    FE->>BE: POST /auth/signup (+ Turnstile token)
    BE->>BE: CaptchaGuard verify Cloudflare
    BE->>DB: INSERT user (isVerified=false)
    BE->>R: Add job → notification-queue
    R-->>BE: Job queued
    BE-->>FE: 201 Created
    Note right of BE: Worker gửi OTP email qua Brevo
    
    Note over U,DB: Xác Thực OTP
    U->>FE: Nhập mã OTP 6 số
    FE->>BE: POST /auth/verify-otp
    BE->>DB: Verify OTP.expiresAt > now()
    BE->>DB: UPDATE user SET isVerified=true
    BE-->>FE: Set-Cookie: token=JWT (HttpOnly, Secure, SameSite)
    FE-->>U: Đăng nhập thành công

    Note over U,DB: Request có Auth
    U->>FE: Thực hiện hành động (mua vé...)
    FE->>BE: POST /booking (Cookie: token=JWT tự động gắn)
    BE->>BE: JwtAuthGuard verify JWT từ Cookie
    BE->>BE: RolesGuard check role
    BE-->>FE: Response
```

---

## 6. Luồng Nghiệp Vụ Quan Trọng

### 6.1 Luồng Mua Vé (Concurrency Booking)

Đây là luồng phức tạp nhất — giải quyết bài toán 80.000 người cùng mua vé.

```mermaid
sequenceDiagram
    participant U as Người Dùng
    participant FE as Next.js Web
    participant CF as Cloudflare Turnstile
    participant BE as NestJS API
    participant R as Redis
    participant DB as PostgreSQL

    Note over U,DB: Bước 0 — Chuẩn bị
    FE->>FE: sinh UUID → lưu sessionStorage['booking_intent_{id}']

    Note over U,DB: Bước 1 — Gửi Request Đặt Vé
    U->>FE: Bấm "Đặt Vé" (chọn loại vé + số lượng)
    FE->>CF: Gửi Turnstile challenge (vô hình)
    CF-->>FE: cf-turnstile-response token

    FE->>BE: POST /booking<br/>{ticketTypeId, quantity}<br/>Header: Idempotency-Key: UUID<br/>Header: x-turnstile-token: TOKEN<br/>Cookie: token=JWT

    Note over BE: Guard Chain

    BE->>BE: ① JwtAuthGuard — verify JWT → lấy userId
    BE->>BE: ② RolesGuard — AUDIENCE role ✓
    BE->>R: ③ ThrottlerGuard — INCR throttler:{userId} (max 3/1s)
    R-->>BE: Còn trong giới hạn ✓
    BE->>CF: ④ CaptchaGuard — POST https://challenges.cloudflare.com/.../siteverify
    CF-->>BE: { success: true } ✓
    BE->>R: ⑤ IdempotencyGuard — SET NX idempotency:{UUID} EX 3600
    R-->>BE: 'OK' (Key chưa tồn tại) ✓

    Note over BE,R: Bước 2 — Atomic Lock
    BE->>R: EVALSHA {sha} 2 KEYS ARGV<br/>KEYS: ticket_type:{id}:available, user:{userId}:ticket_type:{id}:tickets_held<br/>ARGV: quantity, maxPerUser
    Note right of R: Lua Script (single-threaded):<br/>1. GET user_bought<br/>2. IF user_bought + qty > maxPerUser → LIMIT_EXCEEDED<br/>3. GET available<br/>4. IF available < qty → SOLD_OUT<br/>5. DECRBY ticket_key qty<br/>6. INCRBY user_limit_key qty<br/>7. RETURN 'SUCCESS'
    R-->>BE: 'SUCCESS'

    Note over BE,DB: Bước 3 — Queue Job
    BE->>R: BULLMQ: ADD job 'create-order' {userId, ticketTypeId, quantity, idempotencyKey}
    R-->>BE: { jobId }
    BE-->>FE: HTTP 202 { status:'SUCCESS', jobId, idempotencyKey }

    Note over FE: Bước 4 — Polling
    FE->>FE: setInterval 2s
    loop Mỗi 2 giây
        FE->>BE: GET /booking/status?key={UUID}
        BE->>R: GET job_result:{UUID}
        alt Job chưa xong
            R-->>BE: null
            BE-->>FE: { status: 'processing', orderId: null }
        else Job xong
            R-->>BE: orderId
            BE-->>FE: { status: 'completed', orderId }
            FE->>FE: clearInterval → navigate /checkout/{concertId}?orderId={orderId}
        end
    end

    Note over BE,DB: (Nền) Bước 5 — Worker xử lý
    R-->>BE: Worker lấy job từ BullMQ queue
    BE->>DB: BEGIN TRANSACTION
    BE->>DB: INSERT order (status=PENDING, idempotencyKey=UUID)
    BE->>DB: COMMIT
    BE->>R: SET job_result:{UUID} {orderId} EX 3600
```

**Xử lý lỗi:**

| Lỗi | HTTP | Hành động FE |
|---|---|---|
| Bot / Rate limit | 429 | Hiện thông báo "Vui lòng thử lại sau" |
| Captcha fail | 403 | Hiện thông báo "Xác thực thất bại" |
| Double-click | 409 | Bỏ qua (request sau trùng key) |
| SOLD_OUT | 400 | Hiện "Hết vé loại này" |
| LIMIT_EXCEEDED | 400 | Hiện "Bạn đã mua tối đa X vé" |
| Worker fail (3 lần) | — | Job result = 'FAILED', nhả vé Redis, FE sinh key mới |

---

### 6.2 Luồng Thanh Toán và Webhook

```mermaid
sequenceDiagram
    participant U as Người Dùng
    participant FE as Next.js
    participant BE as NestJS API
    participant CB as Circuit Breaker (opossum)
    participant VN as VNPAY/MoMo
    participant DB as PostgreSQL
    participant Q as BullMQ Queue

    Note over U,Q: Bước 1 — Tạo URL Thanh Toán
    U->>FE: Chọn VNPAY/MoMo → bấm "Thanh toán"
    FE->>BE: POST /payment/create-url {orderId, paymentMethod}

    BE->>CB: breaker.fire(order, ipAddress)
    alt Circuit CLOSED (bình thường)
        CB->>VN: Gọi VNPAY API tạo URL<br/>(params sắp xếp alphabet + HMAC-SHA512)
        VN-->>CB: { paymentUrl }
        CB-->>BE: paymentUrl
        BE-->>FE: { paymentUrl }
        FE->>FE: window.location.href = paymentUrl
    else Circuit OPEN (VNPAY sập)
        CB-->>BE: ServiceUnavailableException (503)
        BE-->>FE: 503 "Cổng thanh toán đang bảo trì"
    end

    Note over U,Q: Bước 2 — User thanh toán tại VNPAY
    U->>VN: Nhập OTP/xác thực ngân hàng
    VN->>U: Kết quả thanh toán

    Note over VN,Q: Bước 3 — VNPAY gọi IPN (server-to-server)
    VN->>BE: GET /payment/vnpay-ipn?vnp_TxnRef=ORD-XXX&vnp_ResponseCode=00&vnp_SecureHash=...
    
    BE->>BE: Verify HMAC-SHA512 chữ ký
    alt Chữ ký KHÔNG hợp lệ
        BE-->>VN: { RspCode: '97', Message: 'Invalid Checksum' }
    else Chữ ký hợp lệ
        BE->>DB: SELECT * FROM orders WHERE orderCode='ORD-XXX' FOR UPDATE
        Note right of DB: Pessimistic Lock — block request thứ 2<br/>nếu VNPAY gọi IPN 2 lần cùng lúc
        alt Order đã PAID (xử lý rồi)
            BE-->>VN: { RspCode: '00', Message: 'Already processed' }
        else Order còn PENDING
            BE->>BE: Verify amount: vnp_Amount/100 == order.totalAmount
            BE->>DB: UPDATE order SET status='PAID', paymentId=transactionNo
            loop quantity lần
                BE->>DB: INSERT ticket (qrCode=uuidv4(), status='VALID')
            end
            BE->>DB: UPDATE ticket_type SET soldQuantity += quantity
            BE->>DB: COMMIT
            BE->>Q: ADD job notification {channel: EMAIL, templateId: 'send-ticket'}
            BE-->>VN: { RspCode: '00', Message: 'Confirm Success' }
        end
    end

    Note over U,Q: Bước 4 — User quay về trang kết quả
    VN->>FE: Redirect → /payment/return?vnp_ResponseCode=00
    FE->>FE: Hiển thị màn hình thành công
    U->>FE: Bấm "Xem vé của tôi" → /my-tickets
```

---

### 6.3 Luồng Soát Vé Offline

```mermaid
sequenceDiagram
    participant S as Staff
    participant APP as Flutter App
    participant SQ as SQLite Local
    participant PQ as Pending Queue (SQLite)
    participant BE as NestJS API
    participant BQ as BullMQ
    participant DB as PostgreSQL

    Note over S,DB: Phase A — Trước Sự Kiện (Có Wifi)
    S->>APP: Bấm "Đồng bộ" → chọn Concert
    APP->>BE: GET /ticket/download?concertId={id}
    BE->>DB: SELECT * FROM tickets WHERE concertId=? AND status='VALID'
    DB-->>BE: [40,000+ tickets]
    BE-->>APP: JSON array vé hợp lệ
    APP->>SQ: db.batch(): INSERT OR REPLACE INTO tickets (batch)
    Note right of SQ: INDEX idx_tickets_qr ON tickets(qrCode)<br/>→ tra cứu O(log n)

    Note over S,DB: Phase B — Tại Cổng (Mất Mạng)
    S->>APP: Camera scan QR code
    APP->>SQ: SELECT * FROM tickets WHERE qrCode=?
    alt Không tìm thấy
        SQ-->>APP: null
        APP-->>S: ❌ Màu ĐỎ — "Vé không hợp lệ"
    else status='CHECKED_IN'
        SQ-->>APP: ticket
        APP-->>S: ⚠️ Màu VÀNG — "Vé đã được dùng"
    else status='VALID'
        SQ-->>APP: ticket
        APP->>SQ: UPDATE tickets SET status='CHECKED_IN', synced=0
        APP->>PQ: INSERT ticket_pending_queue (ticketId, action='CHECK_IN', synced=0)
        APP-->>S: ✅ Màu XANH — "Vé hợp lệ" (< 0.1 giây)
    end

    Note over S,DB: Phase C — Khi Bắt Được Sóng (Auto-sync)
    APP->>APP: Detect connectivity
    APP->>PQ: SELECT * FROM ticket_pending_queue WHERE synced=0
    PQ-->>APP: [pending actions]
    APP->>BE: POST /ticket/batch-sync [{ticketId, action, scannedAt}]
    BE->>BQ: ADD job 'process-batch-sync' {items}
    BQ-->>BE: { jobId }
    BE-->>APP: { success: true }
    APP->>PQ: UPDATE SET synced=1

    Note over BQ,DB: (Nền) Worker xử lý đồng bộ
    BQ->>BE: Worker lấy job
    loop mỗi item
        BE->>DB: BEGIN TRANSACTION
        BE->>DB: SELECT * FROM tickets WHERE id=? FOR UPDATE
        alt status='VALID' (chưa ai sync trước)
            BE->>DB: UPDATE tickets SET status='USED', updatedAt=scannedAt
            BE->>DB: COMMIT
        else status='USED' (thiết bị khác đã sync trước)
            BE->>DB: ROLLBACK
            Note right of DB: "First Sync Wins" — vé clone bị bỏ qua
        end
    end
```

---

### 6.4 Luồng Nhập CSV Khách Mời VIP

```mermaid
flowchart TD
    A["Admin upload file CSV\nqua Admin Panel"] --> B["POST /guest/import-csv\nNhận Buffer"]
    B --> C["Validate: MIME type = text/csv"]
    C --> D["Readable.from(buffer) — Tạo Stream\nĐọc TỪNG DÒNG, KHÔNG load toàn bộ vào RAM"]
    D --> E{{"Gom lô 500 dòng"}}
    E -->|"Đủ 500 dòng"| F["Bulk UPSERT 500 records\nINSERT INTO guests (...)\nON CONFLICT (guestCode) DO UPDATE"]
    F -->|"Lô thành công"| G["Tiếp tục đọc dòng tiếp theo"]
    F -->|"Lô lỗi"| H["Fallback: INSERT từng dòng\n(vẫn tiếp tục, không crash)"]
    H --> G
    G --> E
    E -->|"Hết file (số dư < 500)"| I["Flush batch cuối"]
    I --> J["Trả về thống kê:\n{ imported, updated, errors }"]
```

---

## 7. Thiết Kế Các Cơ Chế Bảo Vệ Hệ Thống

### 7.1 Kiểm Soát Tải Đột Biến (Rate Limiting)

**Thuật toán đã chọn: Fixed Window Counter (via `@nestjs/throttler` + Redis)**

Hệ thống đã cài đặt 2 cấp độ rate limiting:

**Cấp độ Global (cho mọi endpoint):**
```typescript
// app.module.ts
ThrottlerModule.forRootAsync({
  useFactory: (config, redisClient) => ({
    throttlers: [{ ttl: 1000, limit: 10 }], // 10 req / 1 giây / IP
    storage: new ThrottlerStorageRedisService(redisClient), // Redis-backed
  })
})
```

**Cấp độ Endpoint-specific (gắt hơn cho API nhạy cảm):**
```typescript
// booking.controller.ts
@Throttle({ default: { limit: 3, ttl: 1000 } }) // 3 req / 1 giây cho /booking

// auth.controller.ts
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req / 1 phút cho /auth/signup & forgot-password
```

**Tại sao dùng Redis storage thay vì in-memory?**
Nếu backend scale lên 3 instance, mỗi instance có counter riêng trong memory → một bot có thể gửi 3 req/giây đến mỗi instance → thực tế gửi được 9 req/giây mà không bị chặn. Redis-backed storage đồng bộ counter giữa tất cả instances.

**Cơ chế bảo vệ chống bot nhiều lớp:**

```mermaid
flowchart LR
    BOT["Bot / Request"] --> L1
    L1{"ThrottlerGuard\n10 req/s global"} -->|"Vượt ngưỡng"| R1["429 Too Many Requests"]
    L1 -->|"OK"| L2
    L2{"CaptchaGuard\nCloudflare Turnstile"} -->|"Không có token\nhoặc fail"| R2["403 Forbidden"]
    L2 -->|"OK"| L3
    L3{"IdempotencyGuard\nRedis SET NX"} -->|"Key đã tồn tại"| R3["409 Conflict"]
    L3 -->|"OK"| L4
    L4{"ThrottlerGuard\n3 req/s booking"} -->|"Vượt ngưỡng"| R4["429 Too Many Requests"]
    L4 -->|"OK"| BUSINESS["Business Logic\nLua Script"]
```

---

### 7.2 Xử Lý Cổng Thanh Toán Không Ổn Định (Circuit Breaker)

**Thư viện sử dụng: `opossum`**

```mermaid
stateDiagram-v2
    [*] --> CLOSED
    
    CLOSED: CLOSED (Bình thường)
    CLOSED: Mọi request đều đi qua
    CLOSED: Đếm số lần lỗi

    OPEN: OPEN (Ngắt mạch)
    OPEN: Từ chối ngay lập tức
    OPEN: Fallback → 503 ngay
    OPEN: Không gọi VNPAY/MoMo

    HALF_OPEN: HALF-OPEN (Thử nghiệm)
    HALF_OPEN: Cho 1 request thử đi qua

    CLOSED --> OPEN: 50% error trong sliding window\nhoặc timeout > 5 giây
    OPEN --> HALF_OPEN: Sau 30 giây
    HALF_OPEN --> CLOSED: Request thành công ✓
    HALF_OPEN --> OPEN: Request thất bại ✗
```

**Cấu hình thực tế (từ codebase `vnpay.strategy.ts` và `momo.strategy.ts`):**

| Tham số | Giá trị | Ý nghĩa |
|---|---|---|
| `timeout` | 5000ms | Quá 5s không phản hồi → tính là lỗi |
| `errorThresholdPercentage` | 50% | 50% request lỗi → chuyển OPEN |
| `resetTimeout` | 30000ms | 30s sau chuyển HALF-OPEN |

**Graceful Degradation:** Khi circuit OPEN, các tính năng không liên quan đến thanh toán (xem concert, số vé còn lại, tìm kiếm...) vẫn hoạt động bình thường — chỉ có luồng tạo URL thanh toán bị từ chối.

---

### 7.3 Chống Trừ Tiền Hai Lần (Idempotency)

TicketBox áp dụng 2 cơ chế bổ sung cho nhau:

**Cơ chế 1: Idempotency Key (Frontend → Backend)**

```mermaid
flowchart TD
    A["User mở trang Booking"] --> B
    B["FE sinh UUID → sessionStorage\nbooking_intent_{concertId}"] --> C
    C["User bấm 'Đặt Vé'"]
    C --> D["POST /booking\nHeader: Idempotency-Key: UUID-abc"]
    D --> E{"Redis:\nSET NX idempotency:UUID-abc 'processing' EX 3600"}
    E -->|"'OK' — Key mới"| F["✅ Xử lý request"]
    E -->|"null — Key đã tồn tại"| G["❌ 409 Conflict"]
    
    subgraph "Tại sao sessionStorage?"
        H["localStorage: DÙNG CHUNG mọi tab\n→ tab 2 bị block nhầm"]
        I["useRef: mất khi F5"]
        J["sessionStorage: CHỈ SỐNG trong 1 tab\n+ tồn tại qua F5\n✓ ĐÚNG"]
    end

    subgraph "Khi booking fail"
        K["Reset: sinh UUID mới\n→ overwrite sessionStorage\n→ user có thể thử lại"]
    end
```

**Cơ chế 2: Pessimistic Lock (VNPAY/MoMo → Backend)**

Áp dụng cho trường hợp VNPAY gọi IPN nhiều lần (retry tự động):

```typescript
// payment.service.ts
const order = await queryRunner.manager.findOne(Order, {
  where: { orderCode },
  lock: { mode: 'pessimistic_write' }, // SELECT ... FOR UPDATE
});

// Nếu order đã PAID → bỏ qua (idempotent)
if (order.status !== OrderStatus.PENDING) {
  await queryRunner.rollbackTransaction();
  return { status: 'IGNORED', message: 'Order already processed' };
}
```

**Cơ chế 3: Amount Verification (chống Payment Bypass)**

```typescript
// payment.service.ts
// Chống hacker sửa vnp_Amount thành 100đ
if (paidAmount !== undefined && Number(paidAmount) !== Number(order.totalAmount)) {
  return { status: 'IGNORED', message: 'Invalid payment amount' };
}
```

---

### 7.4 Caching (Multi-Layer Cache Strategy)

TicketBox áp dụng **4 tầng cache xếp chồng** để hệ thống chịu được hàng chục nghìn người truy cập đồng thời:

```mermaid
flowchart TD
    U["10,000 người dùng\ntruy cập trang concert"] --> T1

    subgraph T1["Tầng 1: Next.js ISR (Server-side Static)"]
        ISR["next: { revalidate: 60 }\nHTML tĩnh build sẵn, serve từ Vercel Edge\nMỗi 60 giây mới revalidate 1 lần dù 1 triệu request\nZero database call"]
    end

    T1 -->|"Trình duyệt load xong"| T2

    subgraph T2["Tầng 2: SWR Client Cache (Browser)"]
        SWR["useSWR('/concerts/{id}/availability', {refreshInterval: 5000})\nMỗi 5 giây poll API lấy số vé mới nhất\nHiển thị data cũ ngay lập tức (fallbackData)"]
    end

    T2 -->|"10,000 SWR requests bay lên"| T3

    subgraph T3["Tầng 3: CDN/Proxy Cache (Network)"]
        CDN["@Header('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10')\nVercel Edge / CDN hấp thụ: 1 request lọt qua, 9,999 lấy cache\n→ Backend chỉ nhận 1 request thực sự / 5 giây"]
    end

    T3 -->|"1 request lọt qua"| T4

    subgraph T4["Tầng 4: Redis In-Memory (Backend)"]
        REDIS["GET ticket_type:{id}:available\n< 1ms latency\nKhông touch PostgreSQL\nSố vé được trừ atomic bởi Lua Script"]
    end

    T4 --> PG["PostgreSQL\nChỉ được truy cập khi:\n• Cache miss (Redis key bị xóa)\n• Khi đặt vé (Worker tạo Order)\n• Khi thanh toán (webhook cập nhật soldQuantity)"]
```

**TTL Strategy:**

| Dữ liệu | TTL | Lý do |
|---|---|---|
| Trang danh sách concert (ISR) | 60 giây | Ít thay đổi, cần SEO tốt |
| Số vé còn lại (CDN) | 5 giây (`s-maxage=5`) | Thay đổi liên tục khi mở bán |
| Số vé còn lại (Redis) | Không hết hạn | Được trừ trực tiếp bởi Lua Script, luôn chính xác |
| Idempotency key (Redis) | 3600 giây | Đủ dài để phòng retry trong 1 giờ |
| Job result (Redis) | 3600 giây | FE poll trong vài giây, không cần giữ lâu |

**Cache Invalidation khi vé thay đổi:**

- **Khi đặt vé (Booking):** Lua Script `DECRBY ticket_type:{id}:available qty` → Redis tự động cập nhật
- **Khi hủy đơn (Cron/Failure):** `rollbackBooking()` gọi `INCRBY` trả vé về Redis
- **Khi server restart:** `onApplicationBootstrap()` dùng `SET NX` để chỉ seed nếu key chưa tồn tại, bảo toàn giá trị đang live

---

## 8. Các Quyết Định Kỹ Thuật Quan Trọng (ADR)

### ADR-001: Redis Lua Script vs Pessimistic DB Lock (Chống Oversell)

**Context:** Cần đảm bảo khi 80.000 người cùng mua vé, không bao giờ bán lố.

**Options:**

| | Redis Lua Script | PostgreSQL SELECT FOR UPDATE |
|---|---|---|
| **Latency** | < 1ms | 5-20ms |
| **Throughput** | ~100k ops/sec | ~5k TPS |
| **Atomic** | Có — single-threaded | Có — MVCC |
| **Risk** | Vé Redis có thể lệch DB nếu crash | Không có risk này |
| **Complexity** | Cần compensating transaction | Simpler |

**Decision:** Redis Lua Script cho việc giữ chỗ (booking). PostgreSQL dùng cho việc ghi chính thức sau khi thanh toán.

**Lý do:** Với 80.000 concurrent users, PostgreSQL sẽ là bottleneck. Redis single-threaded đảm bảo atomicity mà không cần lock — throughput cao hơn 20x. Compensating Transaction (nhả vé khi Worker fail) được xử lý bằng `isRefundedToRedis` flag và Self-Healing Cronjob.

---

### ADR-002: JWT trong HttpOnly Cookie vs Bearer Token Header

**Context:** Cần cơ chế xác thực an toàn cho Web App và Mobile App.

**Options:**

| | HttpOnly Cookie | Bearer Token (Authorization Header) |
|---|---|---|
| **XSS Protection** | ✅ JS không đọc được | ❌ localStorage bị XSS steal |
| **CSRF Risk** | ⚠️ Cần SameSite | ✅ Không có risk |
| **Mobile App** | ❌ Khó quản lý cookie | ✅ Lưu trong secure storage |
| **Cross-domain** | ⚠️ Cần SameSite=None+Secure | ✅ Không vấn đề |

**Decision:** **HttpOnly Cookie cho Web App**, **Bearer Token cho Mobile App**.

**Lý do:** Web App dùng Cookie với `SameSite=Lax` (dev) / `SameSite=None; Secure` (production) — chống XSS hoàn toàn. Mobile App Flutter dùng `flutter_secure_storage` lưu token → gửi qua Authorization header.

---

### ADR-003: BullMQ (trên Redis) vs RabbitMQ vs Kafka

**Context:** Cần Message Queue cho Background Jobs (Order processing, Email, Sync checkin, AI Bio).

**Options:**

| | BullMQ (Redis) | RabbitMQ | Kafka |
|---|---|---|---|
| **Setup** | Dùng Redis có sẵn | Cần thêm 1 service | Cần thêm cluster phức tạp |
| **Throughput** | Tốt (Redis) | Tốt | Rất cao (overkill) |
| **Retry/Backoff** | Built-in | Plugin | Custom |
| **Dashboard** | Bull Board | RabbitMQ Admin | Kafka UI |
| **Phù hợp** | Small-medium scale | Medium scale | High scale (>1M msg/s) |

**Decision:** BullMQ.

**Lý do:** Redis đã được dùng cho Cache và Rate Limiting → không cần thêm infrastructure. BullMQ có built-in retry với exponential backoff, job scheduling, priority queue — đủ mọi tính năng cần thiết. Kafka là overkill cho một concert platform với vài nghìn đơn hàng mỗi giờ.

---

### ADR-004: Modular Monolith vs Microservices

**Context:** Lựa chọn architectural style cho backend.

**Decision:** Modular Monolith (đã trình bày tại mục 1).

**Consequences:**
- ✅ Deploy đơn giản (1 container)
- ✅ Không có network latency giữa các module
- ✅ Dễ debug và phát triển với team nhỏ
- ⚠️ Nếu sau này scale, cần refactor từng module thành microservice riêng (nhưng vì code đã được tổ chức theo module nên việc tách ra không quá khó)

---

### ADR-005: Google Gemini vs OpenAI vs Groq cho AI Bio

**Context:** Cần AI model để tóm tắt PDF press kit thành đoạn giới thiệu nghệ sĩ.

**Decision:** Google Gemini (primary), Groq (fallback) — cả hai đều được implement trong codebase.

**Lý do:** 
- Gemini có free tier phù hợp cho prototype
- AI Provider được thiết kế theo **Strategy Pattern** — dễ switch provider mà không sửa Worker code

```typescript
// ai-provider.interface.ts
export interface AiProviderService {
  summarize(text: string): Promise<string | null>;
}

// Providers: gemini.provider.ts, groq.provider.ts, openai.provider.ts
// Đều implement cùng interface → swap dễ dàng
```

---

### ADR-006: Offline-First với SQLite vs Pure Online

**Context:** Mobile App soát vé cần hoạt động khi mất mạng tại sân vận động.

**Decision:** Offline-First với SQLite (sqflite).

**Lý do:** Sân vận động 40,000 người → mạng di động quá tải hoàn toàn. Nếu dùng pure online, toàn bộ hệ thống soát vé sẽ tê liệt. SQLite local cho phép tra cứu < 0.1 giây không cần Internet.

**Tradeoff — "First Sync Wins":**
Nếu 1 vé được quét ở 2 cổng khác nhau khi offline, cả 2 cổng đều báo xanh. Khi sync lên server, chỉ cổng nào sync trước được tính là hợp lệ. Đây là đánh đổi có chủ ý: tính availability (hoạt động được khi offline) ưu tiên hơn tính consistency tuyệt đối trong trường hợp edge case clone vé.
