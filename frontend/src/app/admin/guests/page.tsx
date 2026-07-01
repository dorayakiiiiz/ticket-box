'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Search, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, X, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { adminService } from '@/services/adminService';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

export type GuestData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  guestCode: string;
  concert: string;
  checkedIn: boolean;
  created: string;
};

// Toast component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-50 border-green-200' 
    : type === 'error' ? 'bg-red-50 border-red-200' 
    : 'bg-blue-50 border-blue-200';
  
  const textColor = type === 'success' ? 'text-green-800' 
    : type === 'error' ? 'text-red-800' 
    : 'text-blue-800';
  
  const Icon = type === 'success' ? CheckCircle 
    : type === 'error' ? XCircle 
    : AlertCircle;

  return (
    <div className={`fixed top-4 right-4 z-[300] max-w-md w-full border ${bgColor} rounded-lg shadow-lg p-4 animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${textColor} flex-shrink-0 mt-0.5`} />
        <div className={`text-sm ${textColor} flex-1`}>
          {message}
        </div>
        <button onClick={onClose} className={`${textColor} hover:opacity-70`}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function AdminEditGuestModal({ guest, onClose, onSuccess }: { guest: GuestData; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(guest.name);
  const [email, setEmail] = useState(guest.email);
  const [phone, setPhone] = useState(guest.phone);
  const [checkedIn, setCheckedIn] = useState(guest.checkedIn);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setToast({ message: 'Vui lòng điền họ và tên', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      await adminService.updateGuest(guest.id, {
        fullName: name,
        email: email || undefined,
        phone: phone || undefined,
        isCheckedIn: checkedIn,
      });
      setToast({ message: 'Cập nhật thông tin thành công!', type: 'success' });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (error: any) {
      console.error(error);
      setToast({ message: error?.response?.data?.message || 'Cập nhật thất bại', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="relative bg-white border border-gray-200 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">Đổi thông tin</h2>
            <p className="text-xs text-gray-500 mt-0.5">#{guest.guestCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Họ và tên</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nhập họ và tên"
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Nhập email"
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Số điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Trạng thái Check-in</label>
            <select
              value={checkedIn ? "true" : "false"}
              onChange={e => setCheckedIn(e.target.value === "true")}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors bg-white"
            >
              <option value="false">Chưa đến</option>
              <option value="true">Đã vào cổng</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={loading} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              Hủy
            </button>
            <button onClick={handleSave} disabled={loading} className="flex-1 bg-gray-900 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDeleteGuestModal({ guest, onClose, onSuccess }: { guest: GuestData; onClose: () => void; onSuccess: () => void }) {
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleDelete = async () => {
    if (confirmName !== guest.name) {
      setToast({ message: 'Tên không khớp', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      await adminService.deleteGuest(guest.id);
      setToast({ message: 'Xóa khách mời thành công!', type: 'success' });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (error: any) {
      console.error(error);
      setToast({ message: error?.response?.data?.message || 'Xóa thất bại', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="relative bg-white border border-red-200 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 style={D} className="text-xl font-black italic text-red-600">Xóa khách mời</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-100 p-4 mb-5 text-sm">
            <p className="font-semibold text-gray-900 mb-1">⚠ Không thể hoàn tác</p>
            <p className="text-gray-600 text-xs">Khách mời <strong>{guest.name}</strong> ({guest.email}) sẽ bị xóa vĩnh viễn khỏi danh sách VIP.</p>
          </div>
          <div className="mb-5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">
              Nhập <span className="text-red-600 font-black">{guest.name}</span> để xác nhận
            </label>
            <input
              value={confirmName}
              onChange={e => setConfirmName(e.target.value)}
              placeholder={guest.name}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-red-300 transition-colors placeholder-gray-300"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              Hủy
            </button>
            <button onClick={handleDelete} disabled={loading || confirmName !== guest.name} className="flex-1 bg-red-600 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Đang xóa...' : 'Xóa khách mời'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminGuestsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [concerts, setConcerts] = useState<any[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<GuestData | null>(null);
  const [deleteModal, setDeleteModal] = useState<GuestData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadGuests = useCallback(async (p: number, s: string) => {
    try {
      setLoading(true);
      const res = await adminService.getGuests(p, limit, s);
      setGuests(res.data);
      setTotal(res.meta.total);
    } catch (error: any) {
      console.error(error);
      setToast({ message: error?.response?.data?.message || 'Lỗi tải dữ liệu', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const loadConcerts = useCallback(async () => {
    try {
      const res = await adminService.getConcerts(1, 100);
      setConcerts(res.data);
      if (res.data.length > 0) {
        setSelectedConcertId(res.data[0].id);
      }
    } catch (error: any) {
      console.error(error);
      setToast({ message: 'Lỗi tải danh sách sự kiện', type: 'error' });
    }
  }, []);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedConcertId) {
      setToast({ message: 'Vui lòng chọn sự kiện trước', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const res = await adminService.importGuestsCSV(selectedConcertId, file);
      setToast({ 
        message: `Upload thành công ${res.stats.imported}\n khách mời `, 
        type: 'success' 
      });
      setRefreshKey(k => k + 1);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      console.error(error);
      setToast({ message: 'Upload file CSV thất bại', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConcerts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadGuests(page, search);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [page, search, refreshKey, loadGuests]); 

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const totalPages = Math.ceil(total / limit);
  const canPrevious = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="mb-8">
        <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Khách mời VIP</h1>
        <p className="text-gray-600">Quản lý danh sách khách mời từ nhãn hàng tài trợ</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white border-2 border-dashed border-gray-300 p-12 mb-8 text-center hover:border-gray-400 transition-colors">
        <Upload size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Nhập danh sách từ CSV</h3>
        <p className="text-sm text-gray-600 mb-6">Kéo thả file CSV hoặc click để chọn file</p>
        
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn sự kiện</label>
          <select
            value={selectedConcertId}
            onChange={(e) => setSelectedConcertId(e.target.value)}
            className="w-full md:w-64 mx-auto px-4 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          >
            <option value="">-- Chọn sự kiện --</option>
            {concerts.map((concert) => (
              <option key={concert.id} value={concert.id}>
                {concert.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!selectedConcertId || loading}
          className={`${
            !selectedConcertId || loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gray-900 hover:bg-gray-800'
          } text-white font-bold text-sm px-6 py-3 transition-colors`}
        >
          {loading ? 'Đang tải...' : 'Chọn file CSV'}
        </button>
        <p className="text-xs text-gray-500 mt-4">Định dạng: name, email, phone</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          className="hidden"
        />
      </div>

      {/* Guests Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">Danh sách khách mời</h2>
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email, SĐT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading && page === 1 ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={32} className="animate-spin text-gray-400" />
                <p className="text-gray-500 text-sm">Đang tải dữ liệu...</p>
              </div>
            </div>
          ) : guests.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500 text-sm">Không có khách mời nào</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Mã VIP</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Concert</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Họ tên</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Số điện thoại</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Check-in</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guests.map(guest => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">{guest.guestCode}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{guest.concert}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{guest.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{guest.email}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{guest.phone}</td>
                    <td className="px-6 py-4">
                      {guest.checkedIn ? (
                        <span className="inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 bg-green-100 text-green-700">
                          ✓ Đã vào cổng
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600">
                          Chưa đến
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative inline-block" ref={openMenuId === guest.id ? menuRef : undefined}>
                        <button onClick={() => setOpenMenuId(id => id === guest.id ? null : guest.id)}
                          className="text-gray-400 hover:text-gray-700 p-1 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === guest.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 shadow-lg z-50">
                            <button onClick={() => { setEditModal(guest); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                              <Edit size={13} className="text-gray-400" /> Đổi thông tin
                            </button>
                            <div className="border-t border-gray-100" />
                            <button onClick={() => { setDeleteModal(guest); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                              <Trash2 size={13} /> Xóa khách mời
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination UI */}
      {guests.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Hiển thị <span className="font-semibold text-gray-900">{(page - 1) * limit + 1}</span> đến{' '}
            <span className="font-semibold text-gray-900">{Math.min(page * limit, total)}</span> trong số{' '}
            <span className="font-semibold text-gray-900">{total}</span> khách mời
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={!canPrevious}
              className={`flex items-center justify-center w-8 h-8 border text-gray-400 transition-colors ${
                canPrevious ? 'border-gray-200 hover:bg-gray-50 cursor-pointer' : 'border-gray-200 bg-gray-50 cursor-not-allowed'
              }`}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = Math.max(1, page - 2) + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`flex items-center justify-center w-8 h-8 border text-sm font-medium transition-colors ${
                    page === pageNum
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!canNext}
              className={`flex items-center justify-center w-8 h-8 border text-gray-400 transition-colors ${
                canNext ? 'border-gray-200 hover:bg-gray-50 cursor-pointer' : 'border-gray-200 bg-gray-50 cursor-not-allowed'
              }`}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {editModal && <AdminEditGuestModal guest={editModal} onClose={() => setEditModal(null)} onSuccess={() => setRefreshKey(k => k + 1)} />}
      {deleteModal && <AdminDeleteGuestModal guest={deleteModal} onClose={() => setDeleteModal(null)} onSuccess={() => setRefreshKey(k => k + 1)} />}
    </div>
  );
}