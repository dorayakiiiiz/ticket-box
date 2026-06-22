# Admin Data Layer — Search, Pagination, Filter & Dashboard

Tài liệu mô tả đầy đủ flow, code từng tầng và lý do chọn cách implement cho 3 tính năng admin:

1. **Search + Pagination** — trang Quản lý Concert
2. **Filter (Dropdown Panel)** — nút Lọc trong Quản lý Concert
3. **Dashboard** — trang tổng quan với dữ liệu thật từ DB

---

## 1. Search & Pagination — Quản lý Concert

### Flow

```
[Admin gõ vào search box]
        ↓
[FE: debounce 300ms — chờ dừng gõ]
        ↓
[FE: gọi GET /concerts?page=1&limit=12&search=blackpink]
        ↓
[BE Controller: parse query params từ string → number]
        ↓
[BE Service: build QueryBuilder với ILIKE + take/skip]
        ↓
[PostgreSQL: SELECT ... WHERE name ILIKE '%blackpink%' LIMIT 12 OFFSET 0]
        ↓
[BE: trả { data: Concert[], meta: { total, page, limit, totalPages } }]
        ↓
[FE: set concerts = data, render pagination từ meta]
```

---

### Tầng 1 — Frontend: Debounce Search

**File:** `frontend/src/app/admin/concerts/page.tsx`

```ts
// Tách 2 state: raw input (hiện trong UI) và debounced value (gửi API)
const [searchInput, setSearchInput] = useState(''); // cập nhật ngay → UI không giật
const [search, setSearch]           = useState(''); // chỉ set sau 300ms dừng → API ít bị gọi
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleSearchChange = (val: string) => {
  setSearchInput(val);
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    setSearch(val);
    setCurrentPage(1); // reset về trang 1 khi search mới
  }, 300);
};
```

> **Tại sao 300ms?** Tốc độ gõ trung bình 200–400ms/ký tự. 300ms đủ để phát hiện "đã dừng gõ" mà không cảm giác lag.

---

### Tầng 2 — Frontend: fetchConcerts + useEffect

```ts
const fetchConcerts = useCallback(
  async (page: number, searchVal: string, status: string, city: string) => {
    setIsLoading(true);
    const result = await adminService.getConcerts(page, LIMIT, searchVal, status, city);
    setConcerts(result.data);
    setTotalPages(result.meta.totalPages);
    setTotal(result.meta.total);
    setCurrentPage(result.meta.page);
    setIsLoading(false);
  }, []
);

// Re-fetch khi bất kỳ tham số nào thay đổi
useEffect(() => {
  fetchConcerts(currentPage, search, filterStatus, filterCity);
}, [currentPage, search, filterStatus, filterCity, fetchConcerts]);
```

> **Tại sao `useCallback` + deps?** Tránh vòng lặp vô tận — `useEffect` depend vào `fetchConcerts`, nếu không wrap bằng `useCallback` thì function mới tạo mỗi render → trigger effect → re-render mãi.

---

### Tầng 3 — Frontend: adminService.getConcerts

**File:** `frontend/src/services/adminService.ts`

```ts
getConcerts: async (
  page = 1, limit = 12, search = '', status = '', city = ''
): Promise<PaginatedConcerts> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { search } : {}),  // bỏ qua nếu rỗng
    ...(status ? { status } : {}),
    ...(city   ? { city   } : {}),
  });
  const res = await apiClient.get(`/concerts?${params}`);
  return res.data;
},
```

**URL thực tế:**
```
GET /concerts?page=1&limit=12
GET /concerts?page=1&limit=12&search=mono&status=UPCOMING&city=Hà Nội
```

---

### Tầng 4 — Backend: Controller

**File:** `backend/src/concert/concert.controller.ts`

```ts
@Public()
@Get()
findAll(
  @Query('page')   page?:   string,
  @Query('limit')  limit?:  string,
  @Query('search') search?: string,
  @Query('status') status?: string,
  @Query('city')   city?:   string,
) {
  return this.concertService.findAll({
    page:  page  ? parseInt(page,  10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    search,
    status,
    city,
  });
}
```

> **Tại sao parse thủ công thay vì `ParseIntPipe`?** ISR homepage gọi không có params → giá trị `undefined`. `ParseIntPipe` throw error với `undefined`. Parse thủ công cho `undefined` pass qua — backward compatible.

---

### Tầng 5 — Backend: Service + QueryBuilder

**File:** `backend/src/concert/concert.service.ts`

```ts
async findAll(options?: {
  page?: number; limit?: number; search?: string; status?: string; city?: string;
}) {
  const { page, limit, search, status, city } = options || {};

  // Backward compatible: ISR homepage gọi không có params → trả hết
  if (!page || !limit) {
    return this.concertRepo.find({ relations: { ticketTypes: true } });
  }

  const qb = this.concertRepo.createQueryBuilder('concert')
    .leftJoinAndSelect('concert.ticketTypes', 'ticketType')
    .orderBy('concert.createdAt', 'DESC')
    .take(limit)                // SQL: LIMIT 12
    .skip((page - 1) * limit); // SQL: OFFSET 0, 12, 24...

  if (search) {
    qb.andWhere('concert.name ILIKE :search', { search: `%${search}%` });
  }

  // Lọc theo trạng thái — khớp chính xác enum
  if (status) {
    qb.andWhere('concert.status = :status', { status });
  }

  // Lọc theo thành phố — ILIKE để không phân biệt hoa/thường
  if (city) {
    qb.andWhere('concert.city ILIKE :city', { city: `%${city}%` });
  }

  const [data, total] = await qb.getManyAndCount();

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
```

**SQL thực tế PostgreSQL nhận (khi có đủ filter):**

```sql
SELECT concert.*, ticketType.*
FROM concerts concert
LEFT JOIN ticket_types ticketType ON ticketType."concertId" = concert.id
WHERE concert."deletedAt" IS NULL       -- TypeORM softDelete tự thêm
  AND concert.name ILIKE '%mono%'       -- search
  AND concert.status = 'UPCOMING'       -- status filter
  AND concert.city  ILIKE '%hà nội%'    -- city filter
ORDER BY concert."createdAt" DESC
LIMIT 12 OFFSET 0;
```

---

## 2. Filter Dropdown Panel — Quản lý Concert

### Vấn đề cần giải quyết

Admin cần thu hẹp danh sách concert theo **trạng thái** (UPCOMING / ONGOING / COMPLETED / CANCELLED) và **thành phố** — không phải tìm theo tên cụ thể như search bar.

### Thiết kế: Draft State + Applied State

Đây là điểm khác biệt so với search. Search dùng debounce — gọi API ngay sau khi gõ. Filter dùng **"commit pattern"** — thay đổi trong panel không có hiệu lực cho đến khi bấm **"Áp dụng"**.

```
Lý do dùng draft state thay vì gọi API ngay:

❌ Gọi API ngay mỗi lần thay đổi 1 select:
   Chọn "UPCOMING" → API call
   Chọn "Hà Nội"   → API call
   → 2 API calls dù admin chưa hoàn thành chọn

✅ Draft state → gọi API 1 lần khi bấm "Áp dụng":
   Chọn "UPCOMING" → chỉ set draftStatus (không call API)
   Chọn "Hà Nội"   → chỉ set draftCity   (không call API)
   Bấm "Áp dụng"   → set filterStatus + filterCity → 1 API call
```

### Flow

```
[Admin bấm nút "Lọc"]
        ↓
[FE: sync draft ← applied values hiện tại (để giữ state cũ khi mở lại panel)]
[FE: mở dropdown panel]
        ↓
[Admin thay đổi Status select / City input]
        ↓
[FE: chỉ cập nhật draftStatus / draftCity — KHÔNG gọi API]
        ↓
[Admin bấm "Áp dụng"]
        ↓
[FE: set filterStatus = draftStatus, filterCity = draftCity]
[FE: setCurrentPage(1) — reset trang]
[FE: đóng panel]
        ↓
[useEffect detect filterStatus/filterCity thay đổi]
        ↓
[FE: gọi GET /concerts?page=1&limit=12&status=UPCOMING&city=Hà Nội]
        ↓
[BE: thêm WHERE status = 'UPCOMING' AND city ILIKE '%hà nội%']
```

### Code — State Management

**File:** `frontend/src/app/admin/concerts/page.tsx`

```ts
const STATUS_OPTIONS = [
  { value: '',          label: 'Tất cả trạng thái' },
  { value: 'UPCOMING',  label: 'Sắp diễn' },
  { value: 'ONGOING',   label: 'Đang diễn' },
  { value: 'COMPLETED', label: 'Đã kết thúc' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

// Applied — giá trị đang có hiệu lực, được gửi lên API
const [filterStatus, setFilterStatus] = useState('');
const [filterCity,   setFilterCity]   = useState('');

// Draft — giá trị đang chọn trong panel, chưa gửi API
const [draftStatus, setDraftStatus] = useState('');
const [draftCity,   setDraftCity]   = useState('');

// Panel open/close
const [filterOpen, setFilterOpen] = useState(false);
const filterPanelRef = useRef<HTMLDivElement>(null);

// Mở panel — sync draft từ applied để không mất state cũ
const openFilter = () => {
  setDraftStatus(filterStatus);
  setDraftCity(filterCity);
  setFilterOpen(v => !v);
};

// Áp dụng — commit draft vào applied → trigger useEffect → gọi API
const applyFilter = () => {
  setFilterStatus(draftStatus);
  setFilterCity(draftCity);
  setCurrentPage(1);
  setFilterOpen(false);
};

// Xóa toàn bộ filter
const clearFilter = () => {
  setDraftStatus(''); setFilterStatus('');
  setDraftCity('');   setFilterCity('');
  setCurrentPage(1);
  setFilterOpen(false);
};

// Đếm số filter đang active → hiện badge trên nút Lọc
const activeFilterCount = [filterStatus, filterCity].filter(Boolean).length;

// Đóng panel khi click ra ngoài
useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
      setFilterOpen(false);
    }
  };
  if (filterOpen) document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [filterOpen]);
```

### Code — UI Panel

```tsx
{/* Nút Lọc — đổi style khi có filter active */}
<div className="relative" ref={filterPanelRef}>
  <button
    onClick={openFilter}
    className={`px-4 py-3 bg-white border flex items-center gap-2 text-sm font-semibold ${
      activeFilterCount > 0 ? 'border-gray-900 text-gray-900' : 'border-gray-200 text-gray-700'
    }`}
  >
    <Filter size={16} />
    Lọc
    {activeFilterCount > 0 && (
      <span className="w-5 h-5 bg-gray-900 text-white text-[10px] font-black rounded-full flex items-center justify-center">
        {activeFilterCount}
      </span>
    )}
  </button>

  {filterOpen && (
    <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 shadow-lg z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">Bộ lọc</span>
        <button onClick={() => setFilterOpen(false)}><X size={16} /></button>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Trạng thái</label>
          <select value={draftStatus} onChange={e => setDraftStatus(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-400">
            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Thành phố</label>
          <input type="text" placeholder="VD: Hà Nội, TP.HCM..." value={draftCity}
            onChange={e => setDraftCity(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-400" />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <button onClick={clearFilter} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">
          Xóa bộ lọc
        </button>
        <button onClick={applyFilter} className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-bold hover:bg-gray-800">
          Áp dụng
        </button>
      </div>
    </div>
  )}
</div>

{/* Filter chips — hiện khi đang active */}
{activeFilterCount > 0 && (
  <div className="flex items-center gap-2 mb-4">
    <span className="text-xs text-gray-500">Đang lọc:</span>
    {filterStatus && (
      <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold">
        {STATUS_OPTIONS.find(o => o.value === filterStatus)?.label}
        <button onClick={() => { setFilterStatus(''); setCurrentPage(1); }}><X size={11} /></button>
      </span>
    )}
    {filterCity && (
      <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold">
        {filterCity}
        <button onClick={() => { setFilterCity(''); setCurrentPage(1); }}><X size={11} /></button>
      </span>
    )}
  </div>
)}
```

### So sánh cách tiếp cận Filter

| | **Đang dùng: Dropdown Panel** | Filter trong URL params | Client-side filter |
|--|--|--|--|
| **Cách hoạt động** | Panel ẩn/hiện, commit khi bấm "Áp dụng" | Mỗi thay đổi cập nhật URL → gọi API | Load hết data, JS lọc |
| **Số API call** | 1 call sau khi xong chọn | Mỗi lần thay đổi 1 call | Chỉ 1 lần đầu |
| **UX** | ✅ Tự nhiên, preview trước khi apply | Trung bình | Nhanh nhưng tốn RAM |
| **Bookmark/share** | ❌ Mất filter khi reload | ✅ URL lưu filter | ❌ |
| **Phù hợp admin tool** | **✅** | Overkill | ❌ khi > 100 records |

> **Tại sao không dùng URL params?** Admin tool không cần bookmark hay share link filter. Thêm URL state management (next/router, router.push) tăng độ phức tạp không cần thiết. Dropdown panel đủ.

> **Tại sao không client-side filter?** Trang đang dùng server-side pagination → chỉ có 12 records trong DOM. Client-side filter chỉ lọc trong 12 records đó, không phải toàn bộ DB.

---

## 3. Admin Dashboard — Dữ liệu thật từ DB

### Vấn đề

Trang `/admin` trước đây dùng toàn bộ dữ liệu hardcode (fake UI). Cần thay bằng data thật từ DB qua 1 endpoint duy nhất.

### Quyết định: 1 endpoint, 3 query song song

```
Thay vì gọi 4 endpoint riêng:
  GET /admin/stats         → 1 call
  GET /admin/revenue-chart → 1 call
  GET /admin/concerts-perf → 1 call
  ...tổng: n round-trips

→ Dùng: GET /admin/dashboard?range=7d → 1 round-trip
   BE chạy 3 nhóm query song song với Promise.all
```

> **Tại sao 1 endpoint?** Admin mở trang chỉ 1 lần, cần tất cả data. Multiple endpoints tốn thêm n round-trips mà không có lợi ích gì. Monolith NestJS chạy cùng process với DB → Promise.all hiệu quả hơn nhiều so với nhiều HTTP calls.

### Flow

```
[Admin vào /admin]
        ↓
[FE: useEffect gọi adminService.getDashboard('7d')]
        ↓
[GET /admin/dashboard?range=7d]  ← 1 round-trip duy nhất
        ↓
[BE AdminService.getDashboard() chạy 3 nhóm song song]
        │
        ├── getStats()           ← 4 query song song với Promise.all
        ├── getRevenueChart(7)   ← GROUP BY theo ngày
        └── getConcertPerformance() ← JOIN concert + ticketTypes + orders
        │
[BE Promise.all([stats, chart, concerts]) — chờ song song]
        ↓
[BE trả { stats, revenueChart, concertPerformance }]
        ↓
[FE: setData → render stat cards, AreaChart, concert list]
        ↓
[Admin bấm "30 ngày"] → re-call getDashboard('30d') → chỉ chart thay đổi
```

---

### Tầng 1 — Backend: AdminService

**File:** `backend/src/admin/admin.service.ts`

#### Nhóm query 1: `getStats()` — 4 stat cards

```ts
private async getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // đầu ngày hôm nay

  const [revenueResult, ticketsResult, activeEvents, checkedInToday] = await Promise.all([
    // Tổng doanh thu từ đơn PAID
    this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.totalAmount)', 'total')
      .where('o.status = :status', { status: OrderStatus.PAID })
      .getRawOne<{ total: string }>(),

    // Tổng vé đã bán (quantity trong đơn PAID)
    this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.quantity)', 'total')
      .where('o.status = :status', { status: OrderStatus.PAID })
      .getRawOne<{ total: string }>(),

    // Concert chưa diễn (date >= hôm nay, chưa soft delete)
    this.concertRepo
      .createQueryBuilder('c')
      .where('c.date >= :today', { today })
      .andWhere('c.deletedAt IS NULL')
      .getCount(),

    // Vé check-in hôm nay (updatedAt >= đầu ngày)
    this.ticketRepo
      .createQueryBuilder('t')
      .where('t.status = :status', { status: TicketStatus.USED })
      .andWhere('t.updatedAt >= :today', { today })
      .getCount(),
  ]);

  return {
    totalRevenue:     parseFloat(revenueResult?.total ?? '0'),
    totalTicketsSold: parseInt(ticketsResult?.total ?? '0', 10),
    activeEvents,
    checkedInToday,
    updatedAt: new Date().toISOString(),
  };
}
```

**SQL tương đương:**
```sql
SELECT SUM("totalAmount") FROM orders WHERE status = 'PAID';
SELECT SUM(quantity)      FROM orders WHERE status = 'PAID';
SELECT COUNT(*) FROM concerts WHERE date >= '2026-06-22 00:00:00' AND "deletedAt" IS NULL;
SELECT COUNT(*) FROM tickets  WHERE status = 'USED' AND "updatedAt" >= '2026-06-22 00:00:00';
```

> **Tại sao Promise.all?** 4 query độc lập nhau — chạy tuần tự lãng phí time. Promise.all chạy song song → tổng thời gian = query chậm nhất (không phải tổng cộng).

---

#### Nhóm query 2: `getRevenueChart(days)` — biểu đồ doanh thu

```ts
private async getRevenueChart(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days); // 7 hoặc 30 ngày trước

  const rows = await this.orderRepo
    .createQueryBuilder('o')
    .select("TO_CHAR(DATE_TRUNC('day', o.createdAt), 'DD/MM')", 'label') // nhãn ngày
    .addSelect('SUM(o.totalAmount)', 'revenue')
    .addSelect('SUM(o.quantity)',    'tickets')
    .where('o.status = :status', { status: OrderStatus.PAID })
    .andWhere('o.createdAt >= :since', { since })
    .groupBy("DATE_TRUNC('day', o.createdAt)")
    .orderBy("DATE_TRUNC('day', o.createdAt)", 'ASC')
    .getRawMany<{ label: string; revenue: string; tickets: string }>();

  return rows.map(r => ({
    label:   r.label,
    revenue: parseFloat(r.revenue ?? '0'),
    tickets: parseInt(r.tickets ?? '0', 10),
  }));
}
```

**SQL tương đương:**
```sql
SELECT
  TO_CHAR(DATE_TRUNC('day', "createdAt"), 'DD/MM') AS label,
  SUM("totalAmount") AS revenue,
  SUM(quantity)      AS tickets
FROM orders
WHERE status = 'PAID'
  AND "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', "createdAt")
ORDER BY DATE_TRUNC('day', "createdAt") ASC;
```

> **Tại sao `DATE_TRUNC` thay vì `DATE()`?** `DATE_TRUNC('day', ...)` trả `timestamp` — dùng được để `GROUP BY` và `ORDER BY` chính xác. `TO_CHAR` chỉ dùng để format label hiển thị (DD/MM), không dùng để group.

---

#### Nhóm query 3: `getConcertPerformance()` — top 10 concert

```ts
private async getConcertPerformance() {
  const rows = await this.concertRepo
    .createQueryBuilder('c')
    .select('c.id',   'id')
    .addSelect('c.name', 'name')
    .addSelect('COALESCE(SUM(tt.soldQuantity),  0)', 'soldQuantity')
    .addSelect('COALESCE(SUM(tt.totalQuantity), 0)', 'totalQuantity')
    .addSelect('COALESCE(SUM(o.totalAmount),    0)', 'revenue')
    .leftJoin('c.ticketTypes', 'tt')
    .leftJoin(Order, 'o', 'o.concertId = c.id AND o.status = :paid', { paid: OrderStatus.PAID })
    .where('c.deletedAt IS NULL')
    .groupBy('c.id')
    .orderBy('revenue', 'DESC')
    .limit(10)
    .getRawMany<{...}>();

  return rows.map(r => {
    const sold  = parseInt(r.soldQuantity, 10);
    const total = parseInt(r.totalQuantity, 10);
    return {
      id: r.id, name: r.name,
      soldQuantity: sold,
      totalQuantity: total,
      soldPercent: total > 0 ? Math.round((sold / total) * 100) : 0,
      revenue: parseFloat(r.revenue),
    };
  });
}
```

**SQL tương đương:**
```sql
SELECT
  c.id, c.name,
  COALESCE(SUM(tt."soldQuantity"),  0) AS "soldQuantity",
  COALESCE(SUM(tt."totalQuantity"), 0) AS "totalQuantity",
  COALESCE(SUM(o."totalAmount"),    0) AS revenue
FROM concerts c
LEFT JOIN ticket_types tt ON tt."concertId" = c.id
LEFT JOIN orders       o  ON o."concertId"  = c.id AND o.status = 'PAID'
WHERE c."deletedAt" IS NULL
GROUP BY c.id
ORDER BY revenue DESC
LIMIT 10;
```

> **Tại sao `COALESCE(..., 0)`?** `LEFT JOIN` + `SUM` trên row NULL trả về `NULL`, không phải `0`. COALESCE đảm bảo concert chưa có vé không bị null.

---

### Tầng 2 — Backend: AdminController + AdminModule

**File:** `backend/src/admin/admin.controller.ts`

```ts
@Controller('admin')
@Roles(UserRole.ORGANIZER)  // chỉ ORGANIZER mới được gọi
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard(@Query('range') range: '7d' | '30d' = '7d') {
    const validRange = range === '30d' ? '30d' : '7d'; // whitelist input
    return this.adminService.getDashboard(validRange);
  }
}
```

**File:** `backend/src/admin/admin.module.ts`

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Concert, Order, Ticket])],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
```

---

### Tầng 3 — Frontend: adminService.getDashboard

**File:** `frontend/src/services/adminService.ts`

```ts
export type DashboardData = {
  stats: {
    totalRevenue: number;
    totalTicketsSold: number;
    activeEvents: number;
    checkedInToday: number;
    updatedAt: string;
  };
  revenueChart: { label: string; revenue: number; tickets: number }[];
  concertPerformance: {
    id: string; name: string;
    soldQuantity: number; totalQuantity: number;
    soldPercent: number; revenue: number;
  }[];
};

getDashboard: async (range: '7d' | '30d' = '7d'): Promise<DashboardData> => {
  const res = await apiClient.get(`/admin/dashboard?range=${range}`);
  return res.data;
},
```

---

### Tầng 4 — Frontend: Dashboard Page

**File:** `frontend/src/app/admin/page.tsx`

```ts
const [revenueRange, setRevenueRange] = useState<'7d' | '30d'>('7d');
const [data, setData]     = useState<DashboardData | null>(null);
const [isLoading, setIsLoading] = useState(true);

// Fetch lại khi range thay đổi
useEffect(() => {
  setIsLoading(true);
  adminService.getDashboard(revenueRange)
    .then(setData)
    .catch(() => setError('Không thể tải dữ liệu dashboard.'))
    .finally(() => setIsLoading(false));
}, [revenueRange]);

// Stat cards dùng data thật
<AdminStatCard
  title="Tổng doanh thu"
  value={stats ? `${(stats.totalRevenue / 1e9).toFixed(1)}B đ` : '--'}
/>

// Recharts nhận revenueChart từ API (dataKey="label")
<AreaChart data={chart}>
  <XAxis dataKey="label" />
  <Area dataKey="revenue" />
</AreaChart>
```

---

### So sánh thiết kế Dashboard

| | **Đang dùng: 1 endpoint** | Multiple endpoints | Client polling |
|--|--|--|--|
| **Round-trips** | **1** | n (n = số widget) | n × polling interval |
| **Cách chạy** | Promise.all song song trong BE | Song song nhưng qua HTTP | Tuần tự hoặc song song |
| **Complexity** | **Thấp** | Cần orchestrate ở FE | Cao |
| **Cache** | Đơn giản (1 key) | n keys | Phức tạp |
| **Phù hợp** | **✅ Monolith admin** | Microservices | Real-time dashboard |

> **Tại sao không cần caching?** Dashboard admin không có concurrent cao. Query phức tạp nhất (getConcertPerformance) chạy trong < 20ms với < 500 concerts. Thêm cache (Redis TTL) tăng staleness và complexity không đáng.

> **Tại sao không polling real-time?** Admin không cần second-by-second updates. Mỗi lần vào trang là đủ — `updatedAt` trong response cho biết timestamp lấy data.

---

## Backward Compatibility — ISR Homepage

ISR homepage (`/`) fetch concerts cho end-user:

```ts
// concertService.ts
export async function getAllConcerts(): Promise<Concert[]> {
  const res = await fetch(`${API_URL}/concerts`, { next: { revalidate: 60 } });
  return res.json();
}
```

ISR không truyền `page`/`limit` → service vào nhánh `!page || !limit` → trả `Concert[]` như cũ:

```
ISR gọi:   GET /concerts                           → find() → Concert[]
Admin gọi: GET /concerts?page=1&limit=12&status=X → QueryBuilder → { data, meta }
```

---

## Tóm tắt quyết định kiến trúc

| Quyết định | Lựa chọn | Tại sao |
|-----------|---------|---------|
| Pagination | Server-side offset | Admin cần nhảy trang, không dùng infinite feed |
| Search algorithm | PostgreSQL ILIKE | 0 setup, đủ nhanh < 1K records, admin không typo |
| Debounce | 300ms | Cân bằng responsive vs số API call |
| Fuzzy search | Không | Admin biết tên chính xác; fuzzy = overkill < 1K |
| Filter trigger | "Áp dụng" (commit) | Tránh gọi API giữa chừng khi đang chọn nhiều filter |
| Filter state | URL params | Không cần — admin tool không share/bookmark link |
| Dashboard endpoint | 1 endpoint tổng hợp | 1 round-trip vs n; Promise.all chạy song song trong BE |
| Dashboard caching | Không | Concurrent thấp, latency < 20ms, không đáng |
| Elasticsearch | Không | Deploy cluster riêng; scale hiện tại không cần |
