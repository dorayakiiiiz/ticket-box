'use client';
import { Upload, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

const ADMIN_GUESTS = [
  { id: 1, concert: "ANH TRAI SAY HI", name: "VIP Guest 1", email: "vip1@sponsor.com", phone: "0901234567", checkedIn: true },
  { id: 2, concert: "ANH TRAI SAY HI", name: "VIP Guest 2", email: "vip2@sponsor.com", phone: "0901234568", checkedIn: false },
  { id: 3, concert: "MỸ TÂM TOUR 2026", name: "VIP Guest 3", email: "vip3@sponsor.com", phone: "0901234569", checkedIn: false },
];

export default function AdminGuestsPage() {
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
    </div>
  );
}
