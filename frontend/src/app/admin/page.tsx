'use client';
import Link from 'next/link';
import { DollarSign, Ticket, Calendar, Users, TrendingUp } from 'lucide-react';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
function fmt(n: number) { return n.toLocaleString('vi-VN'); }

/* Figma: AdminStatCard — bg-white border border-gray-200 rounded-lg p-6 */
function StatCard({ title, value, icon, trend, trendValue }: { title: string; value: string; icon: React.ReactNode; trend?: 'up' | 'down'; trendValue?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center text-gray-600">
          {icon}
        </div>
      </div>
      <p style={D} className="text-3xl font-black text-gray-900 mb-2">{value}</p>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          <TrendingUp size={12} className={trend === 'down' ? 'rotate-180' : ''} />
          {trendValue}
        </div>
      )}
    </div>
  );
}

const RECENT_ORDERS = [
  { id: 'ORD-001', event: 'ANH TRAI SAY HI', user: 'Nguyễn Văn A', total: 10000000, status: 'PAID' },
  { id: 'ORD-002', event: 'RAP VIỆT ALL-STARS', user: 'Trần Thị B', total: 16000000, status: 'PAID' },
  { id: 'ORD-003', event: 'BINZ × TOULIVER', user: 'Lê Văn C', total: 4500000, status: 'PENDING' },
  { id: 'ORD-004', event: 'MỸ TÂM TOUR 2026', user: 'Phạm Thị D', total: 8000000, status: 'PAID' },
  { id: 'ORD-005', event: 'AFTERPARTY FESTIVAL', user: 'Hoàng Văn E', total: 2400000, status: 'CANCELLED' },
];

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Tổng quan hệ thống bán vé</p>
      </div>

      {/* Stats — Figma: grid 4 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Tổng doanh thu" value="48.5B đ" icon={<DollarSign size={20} />} trend="up" trendValue="+12.5%" />
        <StatCard title="Vé đã bán" value="12,847" icon={<Ticket size={20} />} trend="up" trendValue="+8.2%" />
        <StatCard title="Sự kiện đang bán" value="8" icon={<Calendar size={20} />} />
        <StatCard title="Khách hàng" value="5,234" icon={<Users size={20} />} trend="up" trendValue="+15.3%" />
      </div>

      {/* Recent Orders — Figma: bg-white border rounded-lg table */}
      <div className="bg-white border border-gray-200 rounded-sm">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">Đơn hàng gần đây</h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-gray-600 hover:text-gray-900">Xem tất cả →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Mã đơn</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Sự kiện</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {RECENT_ORDERS.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.event}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.user}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{fmt(order.total)}đ</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block text-xs font-bold px-2 py-1 rounded-sm ${
                      order.status === 'PAID' ? 'bg-green-100 text-green-700' :
                      order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {order.status}
                    </span>
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
