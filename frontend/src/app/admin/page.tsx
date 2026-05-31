'use client';
import { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, RefreshCw, Music2, Search, Pencil, Trash2, X } from 'lucide-react';
import { adminService } from '../../services/adminService';
import UploadPdfButton from '../../components/admin/UploadPdfButton';
import ConcertModal from '../../components/admin/ConcertModal';
import type { Concert } from '../../types';

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  ONGOING: 'text-blue-700 bg-blue-50 border-blue-200',
  COMPLETED: 'text-slate-500 bg-slate-100 border-slate-200',
  CANCELLED: 'text-red-600 bg-red-50 border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Sắp diễn',
  ONGOING: 'Đang diễn',
  COMPLETED: 'Đã kết thúc',
  CANCELLED: 'Đã huỷ',
};

export default function AdminPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('create');
  const [modalConcert, setModalConcert] = useState<Concert | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Delete confirm state
  const [deletingConcert, setDeletingConcert] = useState<Concert | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchConcerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getConcerts();
      setConcerts(data);
    } catch {
      setError('Không thể tải danh sách concert. Kiểm tra kết nối backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchConcerts(); }, []);

  const filteredConcerts = concerts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open modal for create
  const openCreate = () => {
    setModalConcert(null);
    setModalMode('create');
    setModalOpen(true);
  };

  // Open modal for view
  const openView = (concert: Concert) => {
    setModalConcert(concert);
    setModalMode('view');
    setModalOpen(true);
  };

  // Open modal for edit
  const openEdit = (concert: Concert) => {
    setModalConcert(concert);
    setModalMode('edit');
    setModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setModalOpen(false);
    setModalConcert(null);
  };

  // After modal save
  const handleSaved = () => {
    closeModal();
    fetchConcerts();
  };

  // Delete concert
  const handleDelete = async () => {
    if (!deletingConcert) return;
    setIsDeleting(true);
    try {
      await adminService.deleteConcert(deletingConcert.id);
      setDeletingConcert(null);
      fetchConcerts();
    } catch {
      setError('Xóa concert thất bại. Thử lại sau.');
      setDeletingConcert(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Danh sách Concert</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isLoading ? 'Đang tải...' : `Quản lý ${concerts.length} concert`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchConcerts}
            aria-label="Làm mới danh sách"
            className="p-2.5 border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 hover:bg-blue-700 transition-all duration-200"
          >
            <Plus size={15} />
            Tạo concert
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm concert theo tên hoặc thành phố..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all duration-200 shadow-sm"
        />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 last:border-b-0">
              <div className="w-10 h-10 bg-slate-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-100 animate-pulse" />
                <div className="h-3 w-32 bg-slate-50 animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div role="alert" className="bg-white border border-red-200 px-6 py-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <div className="text-red-600 font-medium text-sm mb-2">{error}</div>
          <button
            onClick={fetchConcerts}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && concerts.length === 0 && (
        <div className="bg-white border border-slate-200 px-6 py-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Music2 size={28} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Chưa có concert</h3>
          <p className="text-sm text-slate-500 mb-6">Tạo concert đầu tiên để bắt đầu quản lý sự kiện</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-6 py-2.5 hover:bg-blue-700 transition-all duration-200"
          >
            <Plus size={15} />
            Tạo concert mới
          </button>
        </div>
      )}

      {/* Concert table */}
      {!isLoading && !error && filteredConcerts.length > 0 && (
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_140px_100px_180px_70px] bg-slate-50 border-b border-slate-200 px-6 py-3">
            {['Tên concert', 'Thành phố', 'Ngày diễn', 'Trạng thái', 'AI Bio', ''].map(h => (
              <div key={h} className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filteredConcerts.map(c => (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_140px_140px_100px_180px_70px] px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-blue-50/30 transition-colors duration-200 items-center cursor-pointer"
              onClick={() => openView(c)}
            >
              {/* Tên */}
              <div>
                <div className="text-sm font-semibold text-slate-800 truncate">{c.name}</div>
                {c.subtitle && <div className="text-xs text-slate-400 truncate mt-0.5">{c.subtitle}</div>}
              </div>

              {/* Thành phố */}
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin size={13} className="shrink-0 text-slate-400" />
                {c.city}
              </div>

              {/* Ngày diễn */}
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Calendar size={13} className="shrink-0 text-slate-400" />
                {new Date(c.date).toLocaleDateString('vi-VN')}
              </div>

              {/* Status badge */}
              <div>
                <span className={`text-[11px] font-semibold border rounded-full px-2.5 py-1 ${STATUS_STYLE[c.status] ?? ''}`}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </div>

              {/* AI Bio upload */}
              <div onClick={(e) => e.stopPropagation()}>
                <UploadPdfButton concertId={c.id} initialStatus={c.aiBioStatus} onStatusChange={fetchConcerts} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => openEdit(c)}
                  aria-label={`Chỉnh sửa ${c.name}`}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors duration-200"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeletingConcert(c)}
                  aria-label={`Xóa ${c.name}`}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors duration-200"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results from search */}
      {!isLoading && !error && concerts.length > 0 && filteredConcerts.length === 0 && (
        <div className="bg-white border border-slate-200 px-6 py-12 text-center shadow-sm">
          <Search size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Không tìm thấy concert nào phù hợp với &ldquo;{searchQuery}&rdquo;</p>
        </div>
      )}

      {/* Concert Modal (View / Create / Edit) */}
      {modalOpen && (
        <ConcertModal
          mode={modalMode}
          concert={modalConcert}
          onClose={closeModal}
          onSaved={handleSaved}
          onSwitchToEdit={() => {
            if (modalConcert) {
              setModalMode('edit');
            }
          }}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deletingConcert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) setDeletingConcert(null); }}
        >
          <div className="bg-white w-full max-w-sm mx-4 shadow-xl" role="alertdialog" aria-modal="true">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 size={16} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Xóa Concert</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Hành động không thể hoàn tác</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingConcert(null)}
                disabled={isDeleting}
                className="p-2 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 mb-1">
                Bạn có chắc muốn xóa <strong className="text-slate-900">{deletingConcert.name}</strong>?
              </p>
              <p className="text-xs text-red-500 mb-6">
                Tất cả loại vé liên quan sẽ bị xóa vĩnh viễn.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 text-white font-semibold text-sm py-2.5 hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Đang xóa...' : 'Xóa'}
                </button>
                <button
                  onClick={() => setDeletingConcert(null)}
                  disabled={isDeleting}
                  className="px-6 border border-slate-200 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
