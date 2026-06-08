'use client';
import { Plus, MoreVertical } from 'lucide-react';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

const USERS = [
  { id: 1, name: 'Admin TicketZ', email: 'admin@ticketz.vn', role: 'ADMIN', created: '2026-01-15' },
  { id: 2, name: 'Nguyễn Minh Quân', email: 'quan.nm@gmail.com', role: 'STAFF', created: '2026-02-20' },
  { id: 3, name: 'Trần Thị Mai', email: 'mai.tt@gmail.com', role: 'AUDIENCE', created: '2026-03-10' },
  { id: 4, name: 'Lê Hoàng Anh', email: 'anh.lh@gmail.com', role: 'AUDIENCE', created: '2026-03-15' },
  { id: 5, name: 'Phạm Đức Hùng', email: 'hung.pd@gmail.com', role: 'STAFF', created: '2026-04-01' },
  { id: 6, name: 'Vũ Thị Lan', email: 'lan.vt@gmail.com', role: 'AUDIENCE', created: '2026-04-12' },
  { id: 7, name: 'Bùi Quốc Đạt', email: 'dat.bq@gmail.com', role: 'AUDIENCE', created: '2026-05-03' },
];

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  STAFF: 'bg-blue-100 text-blue-700',
  AUDIENCE: 'bg-gray-100 text-gray-700',
};

export default function AdminUsersPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Người dùng</h1>
          <p className="text-gray-600">Quản lý người dùng và phân quyền</p>
        </div>
        <button className="bg-gray-900 text-white font-bold text-sm px-6 py-3 rounded-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> Thêm người dùng
        </button>
      </div>

      {/* Stats — Figma exact: 3-col */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Tổng người dùng</p>
          <p style={D} className="text-3xl font-black text-gray-900">{USERS.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Khán giả</p>
          <p style={D} className="text-3xl font-black text-gray-900">{USERS.filter(u => u.role === 'AUDIENCE').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Nhân viên</p>
          <p style={D} className="text-3xl font-black text-gray-900">{USERS.filter(u => u.role === 'STAFF' || u.role === 'ADMIN').length}</p>
        </div>
      </div>

      {/* Users Table — Figma exact */}
      <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Họ tên</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Vai trò</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {USERS.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">#{user.id}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block text-xs font-bold px-2 py-1 rounded-sm ${ROLE_BADGE[user.role] ?? ''}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.created}</td>
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
