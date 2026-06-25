'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, MoreVertical, Edit, Lock, Trash2, X, Eye, EyeOff, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { adminService } from '@/services/adminService';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

export type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  created: string;
};

const ROLE_BADGE: Record<string, string> = {
  STAFF: 'bg-blue-100 text-blue-700',
  AUDIENCE: 'bg-gray-100 text-gray-700',
};

function AdminUserModal({ user, onClose, onSuccess }: { user?: UserData; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'AUDIENCE');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSave = async () => {
    if (!isEdit) {
      if (!email || !name) return alert('Vui lòng điền đủ họ tên và email');
      if (password !== confirmPassword) return alert('Mật khẩu xác nhận không khớp!');
      if (password.length < 6) return alert('Mật khẩu phải từ 6 ký tự trở lên');
    }

    try {
      setLoading(true);
      if (isEdit) {
        // Edit mode (as requested: keep only name editable? 
        // Wait, the diff showed role select is still there for edit. Let's keep name and role editable for edit)
        await adminService.updateUser(user!.id, { fullName: name, role });
      } else {
        // Create mode
        await adminService.createUser({ email, password, fullName: name, role });
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(error?.response?.data?.message || (isEdit ? 'Cập nhật thất bại' : 'Tạo người dùng thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">
              {isEdit ? 'Đổi thông tin' : 'Tạo người dùng mới'}
            </h2>
            {isEdit && <p className="text-xs text-gray-500 mt-0.5">#{user.id} · {user.email}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Họ và tên *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nhập họ và tên"
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isEdit}
              placeholder="Nhập địa chỉ email"
              className={`w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none ${isEdit ? 'bg-gray-50 cursor-not-allowed' : 'focus:border-gray-400 transition-colors'}`} />
          </div>
          
          {!isEdit && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Mật khẩu *</label>
                <div className="relative">
                  <input 
                    type={showPw ? "text" : "password"}
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-200 text-gray-900 text-sm px-4 pr-10 py-3 outline-none focus:border-gray-400 transition-colors" 
                    placeholder="Nhập mật khẩu"
                  />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Nhập lại mật khẩu *</label>
                <input 
                  type="password"
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors" 
                  placeholder="Xác nhận mật khẩu"
                />
              </div>
            </>
          )}

          {!isEdit && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Vai trò</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors bg-white"
              >
                <option value="AUDIENCE">AUDIENCE</option>
                <option value="STAFF">STAFF</option>
                <option value="ORGANIZER">ORGANIZER</option>
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={loading} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Hủy</button>
            <button onClick={handleSave} disabled={loading} className="flex-1 bg-gray-900 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-gray-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Lưu thay đổi' : 'Tạo người dùng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminChangePasswordModal({ user, onClose, onSuccess }: { user: UserData; onClose: () => void; onSuccess: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Mật khẩu mới phải từ 6 ký tự trở lên');
      return;
    }

    try {
      setLoading(true);
      await adminService.changeUserPassword(user.id, newPassword);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

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
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full border border-gray-200 text-gray-900 text-sm px-4 pr-10 py-3 outline-none focus:border-gray-400 transition-colors" />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Xác nhận mật khẩu</label>
            <input type="password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={loading} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Hủy</button>
            <button onClick={handleSave} disabled={loading} className="flex-1 bg-gray-900 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Cập nhật
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDeleteUserModal({ user, onClose, onSuccess }: { user: UserData; onClose: () => void; onSuccess: () => void }) {
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (confirmName.trim().toUpperCase() !== user.name?.trim().toUpperCase()) {
      alert('Tên xác nhận không khớp!');
      return;
    }

    try {
      setLoading(true);
      await adminService.deleteUser(user.id);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Xóa tài khoản thất bại');
    } finally {
      setLoading(false);
    }
  };

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
              Nhập <span className="text-red-600 font-black">{user.name?.trim().toUpperCase()}</span> để xác nhận
            </label>
            <input
              placeholder={user.name?.trim().toUpperCase()}
              value={confirmName}
              onChange={e => setConfirmName(e.target.value)}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-red-300 transition-colors placeholder-gray-300"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Hủy</button>
            <button onClick={handleSave} disabled={loading || confirmName.trim().toUpperCase() !== user.name?.trim().toUpperCase()} className="flex-1 bg-red-600 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Xóa tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<UserData | null>(null);
  const [pwModal, setPwModal] = useState<UserData | null>(null);
  const [deleteModal, setDeleteModal] = useState<UserData | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Lấy User Stats để hiển thị phía trên
  const [stats, setStats] = useState({ total: 0, staff: 0, audience: 0 });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch stats once on mount or when needed
  useEffect(() => {
    adminService.getUserStats().then(data => setStats(data)).catch(console.error);
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers(currentPage, meta.limit, 'ALL', debouncedSearch);
      setUsers(res.data);
      setMeta(res.meta);
    } catch (error) {
      console.error('Lỗi khi tải danh sách người dùng:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, meta.limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Người dùng</h1>
          <p className="text-gray-600">Quản lý người dùng và phân quyền</p>
        </div>
        <button onClick={() => setCreateModalOpen(true)} className="bg-gray-900 text-white font-bold text-sm px-6 py-3 hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> Thêm người dùng
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Tổng người dùng</p>
          <p style={D} className="text-3xl font-black text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Nhân viên</p>
          <p style={D} className="text-3xl font-black text-gray-900">{stats.staff}</p>
        </div>
        <div className="bg-white border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Khán giả</p>
          <p style={D} className="text-3xl font-black text-gray-900">{stats.audience}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden relative min-h-[400px]">
        {/* Toolbar: Search */}
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên, email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white/70 z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
            <p className="text-sm font-semibold text-gray-500">Đang tải dữ liệu...</p>
          </div>
        )}

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
              {!loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  return (
                    <tr key={user.id} className={`hover:bg-gray-50`}>
                      <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900" title={user.id}>
                        #{user.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-xs font-bold px-2 py-1 ${ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-700'}`}>
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
                              <div className="border-t border-gray-100" />
                              <button onClick={() => { setDeleteModal(user); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                                <Trash2 size={13} /> Xóa tài khoản
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination UI */}
      {meta.totalPages > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Hiển thị <span className="font-semibold text-gray-900">{(currentPage - 1) * meta.limit + 1}</span> đến <span className="font-semibold text-gray-900">{Math.min(currentPage * meta.limit, meta.total)}</span> trong số <span className="font-semibold text-gray-900">{meta.total}</span> người dùng
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`flex items-center justify-center w-8 h-8 border text-sm font-medium transition-colors ${p === currentPage
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))}
              disabled={currentPage >= meta.totalPages}
              className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {editModal && <AdminUserModal user={editModal} onClose={() => setEditModal(null)} onSuccess={fetchUsers} />}
      {createModalOpen && <AdminUserModal onClose={() => setCreateModalOpen(false)} onSuccess={fetchUsers} />}
      {pwModal && <AdminChangePasswordModal user={pwModal} onClose={() => setPwModal(null)} onSuccess={fetchUsers} />}
      {deleteModal && <AdminDeleteUserModal user={deleteModal} onClose={() => setDeleteModal(null)} onSuccess={fetchUsers} />}
    </div>
  );
}
