'use client';
import { useState, useRef, useEffect } from 'react';
import { Upload, Search, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, X } from 'lucide-react';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

const ADMIN_GUESTS = [
  { id: 1, concert: "ANH TRAI SAY HI", name: "VIP Guest 1", email: "vip1@sponsor.com", phone: "0901234567", checkedIn: true },
  { id: 2, concert: "ANH TRAI SAY HI", name: "VIP Guest 2", email: "vip2@sponsor.com", phone: "0901234568", checkedIn: false },
  { id: 3, concert: "MỸ TÂM TOUR 2026", name: "VIP Guest 3", email: "vip3@sponsor.com", phone: "0901234569", checkedIn: false },
];

function AdminEditGuestModal({ guest, onClose }: { guest: typeof ADMIN_GUESTS[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">Đổi thông tin</h2>
            <p className="text-xs text-gray-500 mt-0.5">#{guest.id} · Khách mời VIP</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Họ và tên</label>
            <input defaultValue={guest.name}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Email</label>
            <input type="email" defaultValue={guest.email}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Số điện thoại</label>
            <input type="tel" defaultValue={guest.phone}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Trạng thái Check-in</label>
            <select defaultValue={guest.checkedIn ? "true" : "false"}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors bg-white">
              <option value="false">Chưa đến</option>
              <option value="true">Đã vào cổng</option>
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

function AdminDeleteGuestModal({ guest, onClose }: { guest: typeof ADMIN_GUESTS[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-red-200 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 style={D} className="text-xl font-black uppercase italic text-red-600">Xóa khách mời</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-100 p-4 mb-5 text-sm">
            <p className="font-semibold text-gray-900 mb-1">⚠ Không thể hoàn tác</p>
            <p className="text-gray-600 text-xs">Khách mời <strong>{guest.name}</strong> ({guest.email}) sẽ bị xóa vĩnh viễn khỏi danh sách VIP.</p>
          </div>
          <div className="mb-5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">
              Nhập <span className="text-red-600 font-black">{guest.name.toUpperCase()}</span> để xác nhận
            </label>
            <input placeholder={guest.name.toUpperCase()}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-red-300 transition-colors placeholder-gray-300" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
            <button onClick={onClose} className="flex-1 bg-red-600 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-red-700 transition-colors">
              Xóa khách mời
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminGuestsPage() {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<typeof ADMIN_GUESTS[0] | null>(null);
  const [deleteModal, setDeleteModal] = useState<typeof ADMIN_GUESTS[0] | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Khách mời VIP</h1>
        <p className="text-gray-600">Quản lý danh sách khách mời từ nhãn hàng tài trợ</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white border-2 border-dashed border-gray-300 p-12 mb-8 text-center hover:border-gray-400 transition-colors">
        <Upload size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Nhập danh sách từ CSV</h3>
        <p className="text-sm text-gray-600 mb-6">Kéo thả file CSV hoặc click để chọn file</p>
        <button className="bg-gray-900 text-white font-bold text-sm px-6 py-3 hover:bg-gray-800 transition-colors">
          Chọn file CSV
        </button>
        <p className="text-xs text-gray-500 mt-4">Định dạng: concert, name, email, phone</p>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Concert</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Họ tên</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Số điện thoại</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Check-in</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ADMIN_GUESTS.map(guest => (
                <tr key={guest.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">#{guest.id}</td>
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
        </div>
      </div>

      {/* Pagination UI */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">Hiển thị <span className="font-semibold text-gray-900">1</span> đến <span className="font-semibold text-gray-900">3</span> trong số <span className="font-semibold text-gray-900">3</span> khách mời</p>
        <div className="flex gap-1">
          <button className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed">
            <ChevronLeft size={16} />
          </button>
          <button className="flex items-center justify-center w-8 h-8 border border-gray-900 bg-gray-900 text-white text-sm font-medium">
            1
          </button>
          <button className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors cursor-not-allowed">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {editModal && <AdminEditGuestModal guest={editModal} onClose={() => setEditModal(null)} />}
      {deleteModal && <AdminDeleteGuestModal guest={deleteModal} onClose={() => setDeleteModal(null)} />}
    </div>
  );
}
