'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import ConcertModal from '../../../components/admin/ConcertModal';
import type { Concert } from '../../../types';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

export default function AdminConcertsPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('create');
  const [modalConcert, setModalConcert] = useState<Concert | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [deletingConcert, setDeletingConcert] = useState<Concert | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchConcerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getConcerts();
      setConcerts(data);
    } catch {
      setError('Không thể tải danh sách concert.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchConcerts(); }, []);

  const filtered = concerts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setModalConcert(null); setModalMode('create'); setModalOpen(true); };
  const openEdit   = (c: Concert) => { setModalConcert(c); setModalMode('edit');   setModalOpen(true); };
  const openView   = (c: Concert) => { setModalConcert(c); setModalMode('view');   setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setModalConcert(null); };
  const handleSaved = () => { closeModal(); fetchConcerts(); };

  const handleDelete = async () => {
    if (!deletingConcert) return;
    setIsDeleting(true);
    try {
      await adminService.deleteConcert(deletingConcert.id);
      setDeletingConcert(null);
      fetchConcerts();
    } catch {
      setError('Xóa concert thất bại.');
      setDeletingConcert(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header — Figma exact */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Quản lý Concert</h1>
          <p className="text-gray-600">Tạo và quản lý các sự kiện</p>
        </div>
        <button onClick={openCreate} className="bg-gray-900 text-white font-bold text-sm px-6 py-3 hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16} /> Thêm concert
        </button>
      </div>

      {/* Search & Filter — Figma exact */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm concert..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>
        <button className="px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={16} /> Lọc
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12 text-sm text-gray-500">Đang tải...</div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="bg-white border border-red-200 px-6 py-10 text-center">
          <p className="text-red-600 text-sm font-medium mb-2">{error}</p>
          <button onClick={fetchConcerts} className="text-sm text-blue-600 hover:underline">Thử lại</button>
        </div>
      )}

      {/* Concerts Grid — Figma: 3-col grid with image cards */}
      {!isLoading && !error && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(event => {
              const sold = event.ticketTypes?.length > 0
                ? Math.round(event.ticketTypes.reduce((s, t) => s + t.soldQuantity, 0) / event.ticketTypes.reduce((s, t) => s + t.totalQuantity, 0) * 100)
                : 0;
              return (
                <div key={event.id} className="bg-white border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors cursor-pointer" onClick={() => openView(event)}>
                  <div className="relative h-40">
                    {event.coverImageUrl ? (
                      <img src={event.coverImageUrl} alt={event.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">No Image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 style={D} className="text-lg font-black uppercase text-gray-900 mb-1">{event.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {new Date(event.date).toLocaleDateString('vi-VN')} · {event.venue}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">Đã bán {sold}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-[#CCFF00]" style={{ width: `${sold}%` }} />
                    </div>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(event)} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1">
                        <Edit size={12} /> Sửa
                      </button>
                      <button onClick={() => setDeletingConcert(event)} className="px-3 py-2 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination UI */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">Hiển thị <span className="font-semibold text-gray-900">1</span> đến <span className="font-semibold text-gray-900">6</span> trong số <span className="font-semibold text-gray-900">12</span> concert</p>
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
        </>
      )}

      {/* Empty */}
      {!isLoading && !error && concerts.length === 0 && (
        <div className="bg-white border border-gray-200 px-6 py-16 text-center">
          <p className="text-sm text-gray-500 mb-4">Chưa có concert nào</p>
          <button onClick={openCreate} className="bg-gray-900 text-white font-bold text-sm px-6 py-3 hover:bg-gray-800 transition-colors">
            <Plus size={16} className="inline mr-1" /> Tạo concert mới
          </button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <ConcertModal
          mode={modalMode}
          concert={modalConcert}
          onClose={closeModal}
          onSaved={handleSaved}
          onSwitchToEdit={() => { if (modalConcert) setModalMode('edit'); }}
        />
      )}

      {/* Delete Confirm — Figma style */}
      {deletingConcert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isDeleting && setDeletingConcert(null)} />
          <div className="relative bg-white w-full max-w-sm">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">Xóa Concert</h2>
              <button onClick={() => setDeletingConcert(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Bạn có chắc muốn xóa <strong className="text-gray-900">{deletingConcert.name}</strong>? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingConcert(null)} disabled={isDeleting}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
                  Hủy
                </button>
                <button onClick={handleDelete} disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
                  {isDeleting ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
