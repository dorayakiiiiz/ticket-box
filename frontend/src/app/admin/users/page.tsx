'use client';
import { useState, useRef, useEffect } from 'react';
import { Plus, MoreVertical, Edit, Lock, Trash2, X, CheckCircle, Eye, EyeOff, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

const USERS = [
  { id: 1, name: 'Admin TicketZ', email: 'admin@ticketz.vn', role: 'ADMIN', created: '2026-01-15' },
  { id: 2, name: 'Nguyễn Minh Quân', email: 'quan.nm@gmail.com', role: 'STAFF', created: '2026-02-20' },
  { id: 3, name: 'Trần Thị Mai', email: 'mai.tt@gmail.com', role: 'AUDIENCE', created: '2026-03-10' },
  { id: 4, name: 'Lê Hoàng Anh', email: 'anh.lh@gmail.com', role: 'AUDIENCE', created: '2026-03-15' },
  { id: 5, name: 'Phạm Đức Hùng', email: 'hung.pd@gmail.com', role: 'STAFF', created: '2026-04-01' },
  { id: 6, name: 'Vũ Thị Lan', email: 'lan.vt@gmail.com', role: 'AUDIENCE', created: '2026-04-12' },
  { id: 7, name: 'Bùi Quốc Đạt', email: 'dat.bq@gmail.com', role: 'AUDIENCE', created: '2026-05-03' },
  // Mock thêm dữ liệu để đủ 2 trang
  { id: 8, name: 'Lê Thị Thu', email: 'thu.lt@gmail.com', role: 'AUDIENCE', created: '2026-05-10' },
  { id: 9, name: 'Đoàn Văn Hậu', email: 'hau.dv@gmail.com', role: 'STAFF', created: '2026-05-12' },
  { id: 10, name: 'Hồ Quang Hiếu', email: 'hieu.hq@gmail.com', role: 'AUDIENCE', created: '2026-05-15' },
  { id: 11, name: 'Ngô Thanh Vân', email: 'van.nt@gmail.com', role: 'ADMIN', created: '2026-05-20' },
  { id: 12, name: 'Đặng Thu Thảo', email: 'thao.dt@gmail.com', role: 'AUDIENCE', created: '2026-06-01' },
];

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  STAFF: 'bg-blue-100 text-blue-700',
  AUDIENCE: 'bg-gray-100 text-gray-700',
};

const CURRENT_ADMIN_ID = 1;

function AdminEditUserModal({ user, onClose }: { user: typeof USERS[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">Đổi thông tin</h2>
            <p className="text-xs text-gray-500 mt-0.5">#{user.id} · {user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Họ và tên</label>
            <input defaultValue={user.name}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Email</label>
            <input type="email" defaultValue={user.email} disabled
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none bg-gray-50 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Vai trò</label>
            <select defaultValue={user.role}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors bg-white">
              <option value="AUDIENCE">AUDIENCE</option>
              <option value="STAFF">STAFF</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
            <button onClick={onClose} className="flex-1 bg-gray-900 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-gray-700 transition-colors">Lưu thay đổi</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminChangePasswordModal({ user, onClose }: { user: typeof USERS[0]; onClose: () => void }) {
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">Đổi mật khẩu</h2>
            <p className="text-xs text-gray-500 mt-0.5">{user.name} · {user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Mật khẩu mới</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"}
                className="w-full border border-gray-200 text-gray-900 text-sm px-4 pr-10 py-3 outline-none focus:border-gray-400 transition-colors" />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Xác nhận mật khẩu</label>
            <input type="password"
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
            <button onClick={onClose} className="flex-1 bg-gray-900 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-gray-700 transition-colors">Cập nhật</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDeleteUserModal({ user, onClose }: { user: typeof USERS[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-red-200 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 style={D} className="text-xl font-black uppercase italic text-red-600">Xóa tài khoản</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-100 p-4 mb-5 text-sm">
            <p className="font-semibold text-gray-900 mb-1">⚠ Không thể hoàn tác</p>
            <p className="text-gray-600 text-xs">Tài khoản <strong>{user.name}</strong> ({user.email}) sẽ bị xóa vĩnh viễn.</p>
          </div>
          <div className="mb-5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">
              Nhập <span className="text-red-600 font-black">{user.name.toUpperCase()}</span> để xác nhận
            </label>
            <input placeholder={user.name.toUpperCase()}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-red-300 transition-colors placeholder-gray-300" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
            <button onClick={onClose} className="flex-1 bg-red-600 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-red-700 transition-colors">
              Xóa tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<typeof USERS[0] | null>(null);
  const [pwModal, setPwModal] = useState<typeof USERS[0] | null>(null);
  const [deleteModal, setDeleteModal] = useState<typeof USERS[0] | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Mock pagination: show first 7 items on page 1
  const displayedUsers = USERS.slice(0, 7);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Người dùng</h1>
          <p className="text-gray-600">Quản lý người dùng và phân quyền</p>
        </div>
        <button className="bg-gray-900 text-white font-bold text-sm px-6 py-3 hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> Thêm người dùng
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Tổng người dùng</p>
          <p style={D} className="text-3xl font-black text-gray-900">{USERS.length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Admin</p>
          <p style={D} className="text-3xl font-black text-gray-900">{USERS.filter(u => u.role === 'ADMIN').length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Nhân viên</p>
          <p style={D} className="text-3xl font-black text-gray-900">{USERS.filter(u => u.role === 'STAFF').length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Khán giả</p>
          <p style={D} className="text-3xl font-black text-gray-900">{USERS.filter(u => u.role === 'AUDIENCE').length}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        {/* Toolbar: Search */}
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <div className="relative w-full max-w-sm">
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên, email..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

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
              {displayedUsers.map(user => {
                const isSelf = user.id === CURRENT_ADMIN_ID;
                return (
                  <tr key={user.id} className={`hover:bg-gray-50 ${isSelf ? "bg-yellow-50/60" : ""}`}>
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">#{user.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                        {isSelf && (
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-200">
                            Bạn
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-bold px-2 py-1 ${ROLE_BADGE[user.role] ?? ''}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.created}</td>
                    <td className="px-6 py-4">
                      <div className="relative inline-block" ref={openMenuId === user.id ? menuRef : undefined}>
                        <button onClick={() => setOpenMenuId(id => id === user.id ? null : user.id)}
                          className="text-gray-400 hover:text-gray-700 p-1 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === user.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 shadow-lg z-50">
                            <button onClick={() => { setEditModal(user); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                              <Edit size={13} className="text-gray-400" /> Đổi thông tin
                            </button>
                            <button onClick={() => { setPwModal(user); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                              <Lock size={13} className="text-gray-400" /> Đổi mật khẩu
                            </button>
                            {!isSelf && (
                              <>
                                <div className="border-t border-gray-100" />
                                <button onClick={() => { setDeleteModal(user); setOpenMenuId(null); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                                  <Trash2 size={13} /> Xóa tài khoản
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination UI */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">Hiển thị <span className="font-semibold text-gray-900">1</span> đến <span className="font-semibold text-gray-900">7</span> trong số <span className="font-semibold text-gray-900">12</span> người dùng</p>
        <div className="flex gap-1">
          <button className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed">
            <ChevronLeft size={16} />
          </button>
          <button className="flex items-center justify-center w-8 h-8 border border-gray-900 bg-gray-900 text-white text-sm font-medium">
            1
          </button>
          <button className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
            2
          </button>
          <button className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {editModal && <AdminEditUserModal user={editModal} onClose={() => setEditModal(null)} />}
      {pwModal && <AdminChangePasswordModal user={pwModal} onClose={() => setPwModal(null)} />}
      {deleteModal && <AdminDeleteUserModal user={deleteModal} onClose={() => setDeleteModal(null)} />}
    </div>
  );
}
