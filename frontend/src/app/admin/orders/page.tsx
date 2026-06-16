'use client';
import { useState } from 'react';
import { MoreVertical } from 'lucide-react';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
function fmt(n: number) { return n.toLocaleString('vi-VN'); }

const ORDERS = [
  { id: 'ORD-001', date: '2026-06-01', event: 'ANH TRAI SAY HI', user: 'Nguyễn Văn A', zone: 'SVIP — A', qty: 2, total: 10000000, status: 'PAID' },
  { id: 'ORD-002', date: '2026-06-02', event: 'RAP VIỆT ALL-STARS', user: 'Trần Thị B', zone: 'VIP — A', qty: 4, total: 16000000, status: 'PAID' },
  { id: 'ORD-003', date: '2026-06-03', event: 'BINZ × TOULIVER', user: 'Lê Văn C', zone: 'CAT 1A', qty: 3, total: 4500000, status: 'PENDING' },
  { id: 'ORD-004', date: '2026-06-04', event: 'MỸ TÂM TOUR 2026', user: 'Phạm Thị D', zone: 'SKY LOUNGE', qty: 1, total: 8000000, status: 'PAID' },
  { id: 'ORD-005', date: '2026-06-05', event: 'AFTERPARTY FESTIVAL', user: 'Hoàng Văn E', zone: 'FANZONE 1A', qty: 2, total: 2400000, status: 'CANCELLED' },
  { id: 'ORD-006', date: '2026-06-06', event: 'ĐEN VÂU — TRỜI ƠI!', user: 'Vũ Thị F', zone: 'CAT 2A', qty: 2, total: 2400000, status: 'PAID' },
  { id: 'ORD-007', date: '2026-06-07', event: 'MONO — WINTER', user: 'Bùi Văn G', zone: 'VIP — B', qty: 1, total: 4000000, status: 'PENDING' },
];

const BADGE: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const filtered = statusFilter === 'ALL' ? ORDERS : ORDERS.filter(o => o.status === statusFilter);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Quản lý Đơn hàng</h1>
        <p className="text-gray-600">Quản lý toàn bộ đơn hàng của khách hàng</p>
      </div>

      {/* Filter tabs — Figma exact */}
      <div className="flex gap-2 mb-6">
        {['ALL', 'PAID', 'PENDING', 'CANCELLED'].map(status => (
          <button key={status} onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 text-sm font-bold transition-colors ${
              statusFilter === status
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            {status === 'ALL' ? 'Tất cả' : status}
          </button>
        ))}
      </div>

      {/* Orders Table — Figma exact */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Mã đơn</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Sự kiện</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khu vực</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">SL</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.event}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.user}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.zone}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.qty}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{fmt(order.total)}đ</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block text-xs font-bold px-2 py-1 ${BADGE[order.status] ?? ''}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
