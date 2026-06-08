'use client';
import { useState } from 'react';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

const TICKETS = [
  { id: 'TK-001', orderId: 'ORD-001', event: 'ANH TRAI SAY HI', zone: 'SVIP — A', holder: 'Nguyễn Văn A', qrCode: 'VT-A1B2C3', status: 'UNUSED', checkInTime: null },
  { id: 'TK-002', orderId: 'ORD-001', event: 'ANH TRAI SAY HI', zone: 'SVIP — A', holder: 'Nguyễn Văn A', qrCode: 'VT-D4E5F6', status: 'CHECKED_IN', checkInTime: '18:32' },
  { id: 'TK-003', orderId: 'ORD-002', event: 'RAP VIỆT ALL-STARS', zone: 'VIP — A', holder: 'Trần Thị B', qrCode: 'VT-G7H8I9', status: 'UNUSED', checkInTime: null },
  { id: 'TK-004', orderId: 'ORD-002', event: 'RAP VIỆT ALL-STARS', zone: 'VIP — A', holder: 'Trần Thị B', qrCode: 'VT-J0K1L2', status: 'CHECKED_IN', checkInTime: '19:15' },
  { id: 'TK-005', orderId: 'ORD-003', event: 'BINZ × TOULIVER', zone: 'CAT 1A', holder: 'Lê Văn C', qrCode: 'VT-M3N4O5', status: 'UNUSED', checkInTime: null },
  { id: 'TK-006', orderId: 'ORD-004', event: 'MỸ TÂM TOUR 2026', zone: 'SKY LOUNGE', holder: 'Phạm Thị D', qrCode: 'VT-P6Q7R8', status: 'CHECKED_IN', checkInTime: '19:45' },
];

export default function AdminTicketsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const filtered = statusFilter === 'ALL' ? TICKETS : TICKETS.filter(t => t.status === statusFilter);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Quản lý Vé điện tử</h1>
        <p className="text-gray-600">Danh sách tất cả vé đã được tạo</p>
      </div>

      {/* Stats — Figma exact: 3-col */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Tổng vé</p>
          <p style={D} className="text-3xl font-black text-gray-900">{TICKETS.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Đã check-in</p>
          <p style={D} className="text-3xl font-black text-green-600">{TICKETS.filter(t => t.status === 'CHECKED_IN').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Chưa sử dụng</p>
          <p style={D} className="text-3xl font-black text-gray-900">{TICKETS.filter(t => t.status === 'UNUSED').length}</p>
        </div>
      </div>

      {/* Filter tabs — Figma exact */}
      <div className="flex gap-2 mb-6">
        {['ALL', 'UNUSED', 'CHECKED_IN'].map(status => (
          <button key={status} onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 text-sm font-bold rounded-sm transition-colors ${
              statusFilter === status
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            {status === 'ALL' ? 'Tất cả' : status === 'UNUSED' ? 'Chưa dùng' : 'Đã check-in'}
          </button>
        ))}
      </div>

      {/* Tickets Table — Figma exact */}
      <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Mã vé</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Đơn hàng</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Sự kiện</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khu vực</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">QR Code</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(ticket => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">{ticket.id}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{ticket.orderId}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{ticket.event}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{ticket.zone}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{ticket.holder}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{ticket.qrCode}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block text-xs font-bold px-2 py-1 rounded-sm ${
                      ticket.status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {ticket.status === 'CHECKED_IN' ? 'Đã check-in' : 'Chưa dùng'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {ticket.checkInTime || '—'}
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
