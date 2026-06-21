'use client';
import { useState, useMemo } from 'react';
import { Eye, Search, X, Ticket } from 'lucide-react';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
function fmt(n: number) { return n.toLocaleString('vi-VN'); }

type OrderData = {
  id: string;
  date: string;
  event: string;
  user: string;
  email: string;
  zone: string;
  qty: number;
  total: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  tickets: { code: string; checkIn: string | null }[];
};

const ORDERS: OrderData[] = [
  { id: 'ORD-001', date: '2026-06-01', event: 'ANH TRAI SAY HI', user: 'Nguyễn Văn A', email: 'a.nguyen@gmail.com', zone: 'SVIP — A', qty: 2, total: 10000000, status: 'PAID', tickets: [{ code: 'VT-A1B2C3', checkIn: null }, { code: 'VT-D4E5F6', checkIn: '18:32' }] },
  { id: 'ORD-002', date: '2026-06-02', event: 'RAP VIỆT ALL-STARS', user: 'Trần Thị B', email: 'b.tran@gmail.com', zone: 'VIP — A', qty: 4, total: 16000000, status: 'PAID', tickets: [{ code: 'VT-G7H8I9', checkIn: null }, { code: 'VT-J0K1L2', checkIn: '19:15' }] },
  { id: 'ORD-003', date: '2026-06-03', event: 'BINZ × TOULIVER', user: 'Lê Văn C', email: 'c.le@gmail.com', zone: 'CAT 1A', qty: 3, total: 4500000, status: 'PENDING', tickets: [] },
  { id: 'ORD-004', date: '2026-06-04', event: 'MỸ TÂM TOUR 2026', user: 'Phạm Thị D', email: 'd.pham@gmail.com', zone: 'SKY LOUNGE', qty: 1, total: 8000000, status: 'PAID', tickets: [{ code: 'VT-P6Q7R8', checkIn: '19:45' }] },
  { id: 'ORD-005', date: '2026-06-05', event: 'AFTERPARTY FESTIVAL', user: 'Hoàng Văn E', email: 'e.hoang@gmail.com', zone: 'FANZONE 1A', qty: 2, total: 2400000, status: 'CANCELLED', tickets: [] },
  { id: 'ORD-006', date: '2026-06-06', event: 'ĐEN VÂU — TRỜI ƠI!', user: 'Vũ Thị F', email: 'f.vu@gmail.com', zone: 'CAT 2A', qty: 2, total: 2400000, status: 'PAID', tickets: [{ code: 'VT-M9N0O1', checkIn: null }, { code: 'VT-P2Q3R4', checkIn: null }] },
  { id: 'ORD-007', date: '2026-06-07', event: 'MONO — WINTER', user: 'Bùi Văn G', email: 'g.bui@gmail.com', zone: 'VIP — B', qty: 1, total: 4000000, status: 'PENDING', tickets: [] },
];

const BADGE: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  const filtered = useMemo(() => {
    return ORDERS.filter(o => {
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch = o.id.toLowerCase().includes(q) ||
        o.user.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [statusFilter, searchQuery]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Quản lý Đơn hàng</h1>
        <p className="text-gray-600">Tra cứu đơn hàng và chi tiết vé điện tử của khách</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
        <div className="flex gap-2">
          {['ALL', 'PAID', 'PENDING', 'CANCELLED'].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-bold transition-colors ${statusFilter === status
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
              {status === 'ALL' ? 'Tất cả' : status}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Mã đơn, Tên, Email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-white"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Mã đơn</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Sự kiện</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khu vực / SL</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Không tìm thấy đơn hàng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono font-bold text-gray-900">{order.id}</p>
                      <p className="text-xs text-gray-500">{order.date}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{order.event}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{order.user}</p>
                      <p className="text-xs text-gray-500">{order.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{order.zone}</span> × {order.qty}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{fmt(order.total)}đ</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-bold px-2 py-1 ${BADGE[order.status] ?? ''}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 transition-colors"
                      >
                        <Eye size={14} /> Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h2 style={D} className="text-2xl font-black uppercase italic text-gray-900">Chi tiết đơn {selectedOrder.id}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedOrder.date}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-900">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Khách hàng</p>
                  <p className="text-base font-semibold text-gray-900">{selectedOrder.user}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.email}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sự kiện & Khu vực</p>
                  <p className="text-base font-semibold text-gray-900">{selectedOrder.event}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.zone} (Số lượng: {selectedOrder.qty})</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                  <Ticket size={16} /> Danh sách Vé điện tử
                </h3>

                {selectedOrder.status !== 'PAID' ? (
                  <div className="bg-yellow-50 text-yellow-800 p-4 text-sm text-center border border-yellow-200">
                    Đơn hàng chưa thanh toán thành công nên chưa có vé được cấp.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedOrder.tickets.map((ticket, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white border border-gray-200 flex items-center justify-center font-mono font-bold text-gray-900 text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Mã vé (QR Code)</p>
                            <p className="text-base font-mono font-bold text-gray-900">{ticket.code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium mb-1">Trạng thái Check-in</p>
                          {ticket.checkIn ? (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-bold">
                              Đã vào cổng ({ticket.checkIn})
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 text-xs font-bold">
                              Chưa sử dụng
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-right">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-gray-900 text-white font-bold text-sm px-6 py-2.5 hover:bg-gray-800 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
