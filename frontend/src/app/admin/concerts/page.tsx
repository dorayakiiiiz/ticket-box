"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { adminService } from "../../../services/adminService";
import ConcertModal from "../../../components/admin/ConcertModal";
import type { Concert } from "../../../types";

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const LIMIT = 12;

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "UPCOMING", label: "Sắp diễn" },
  { value: "ONGOING", label: "Đang diễn" },
  { value: "COMPLETED", label: "Đã kết thúc" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export default function AdminConcertsPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search: raw input + debounced value (300ms)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter — applied values (gửi lên API)
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCity, setFilterCity] = useState("");

  // Filter — draft values (đang chọn trong panel, chưa áp dụng)
  const [draftStatus, setDraftStatus] = useState("");
  const [draftCity, setDraftCity] = useState("");

  // Filter panel toggle
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const [modalMode, setModalMode] = useState<"view" | "create" | "edit">(
    "create",
  );
  const [modalConcert, setModalConcert] = useState<Concert | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [deletingConcert, setDeletingConcert] = useState<Concert | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchConcerts = useCallback(
    async (page: number, searchVal: string, status: string, city: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await adminService.getConcerts(
          page,
          LIMIT,
          searchVal,
          status,
          city,
        );
        setConcerts(result.data);
        setTotalPages(result.meta.totalPages);
        setTotal(result.meta.total);
        setCurrentPage(result.meta.page);
      } catch {
        setError("Không thể tải danh sách concert.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Gọi lại API khi search, page, hoặc filter thay đổi
  useEffect(() => {
    fetchConcerts(currentPage, search, filterStatus, filterCity);
  }, [currentPage, search, filterStatus, filterCity, fetchConcerts]);

  // Debounce search input 300ms — reset về page 1 khi search thay đổi
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 300);
  };

  // Đóng panel khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    };
    if (filterOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  // Mở panel — sync draft từ applied values
  const openFilter = () => {
    setDraftStatus(filterStatus);
    setDraftCity(filterCity);
    setFilterOpen((v) => !v);
  };

  // Áp dụng filter
  const applyFilter = () => {
    setFilterStatus(draftStatus);
    setFilterCity(draftCity);
    setCurrentPage(1);
    setFilterOpen(false);
  };

  // Xóa toàn bộ filter
  const clearFilter = () => {
    setDraftStatus("");
    setDraftCity("");
    setFilterStatus("");
    setFilterCity("");
    setCurrentPage(1);
    setFilterOpen(false);
  };

  // Đếm số filter đang active để hiện badge
  const activeFilterCount = [filterStatus, filterCity].filter(Boolean).length;

  const openCreate = () => {
    setModalConcert(null);
    setModalMode("create");
    setModalOpen(true);
  };
  const openEdit = (c: Concert) => {
    setModalConcert(c);
    setModalMode("edit");
    setModalOpen(true);
  };
  const openView = (c: Concert) => {
    setModalConcert(c);
    setModalMode("view");
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalConcert(null);
  };
  const handleSaved = () => {
    closeModal();
    fetchConcerts(currentPage, search, filterStatus, filterCity);
  };

  const handleDelete = async () => {
    if (!deletingConcert) return;
    setIsDeleting(true);
    try {
      await adminService.deleteConcert(deletingConcert.id);
      setDeletingConcert(null);
      const nextPage =
        concerts.length === 1 && currentPage > 1
          ? currentPage - 1
          : currentPage;
      fetchConcerts(nextPage, search, filterStatus, filterCity);
    } catch {
      setError("Xóa concert thất bại.");
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
          <h1
            style={D}
            className="text-4xl font-black uppercase italic text-gray-900 mb-2"
          >
            Quản lý Concert
          </h1>
          <p className="text-gray-600">Tạo và quản lý các sự kiện</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-gray-900 text-white font-bold text-sm px-6 py-3 hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Thêm concert
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm concert..."
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>

        {/* Filter button + dropdown panel */}
        <div className="relative" ref={filterPanelRef}>
          <button
            onClick={openFilter}
            className={`px-4 py-3 bg-white border transition-colors flex items-center gap-2 text-sm font-semibold ${
              activeFilterCount > 0
                ? 'border-gray-900 text-gray-900'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            Lọc
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 bg-gray-900 text-white text-[10px] font-black rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 shadow-lg z-50">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Bộ lọc</span>
                <button onClick={() => setFilterOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 py-4 space-y-4">
                {/* Trạng thái */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={draftStatus}
                    onChange={e => setDraftStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Thành phố */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Thành phố
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Hà Nội, TP.HCM..."
                    value={draftCity}
                    onChange={e => setDraftCity(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                <button
                  onClick={clearFilter}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Xóa bộ lọc
                </button>
                <button
                  onClick={applyFilter}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-500">Đang lọc:</span>
          {filterStatus && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold">
              {STATUS_OPTIONS.find(o => o.value === filterStatus)?.label}
              <button onClick={() => { setFilterStatus(''); setCurrentPage(1); }} className="ml-1 text-gray-400 hover:text-gray-700">
                <X size={11} />
              </button>
            </span>
          )}
          {filterCity && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold">
              {filterCity}
              <button onClick={() => { setFilterCity(''); setCurrentPage(1); }} className="ml-1 text-gray-400 hover:text-gray-700">
                <X size={11} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12 text-sm text-gray-500">
          Đang tải...
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="bg-white border border-red-200 px-6 py-10 text-center">
          <p className="text-red-600 text-sm font-medium mb-2">{error}</p>
          <button
            onClick={() => fetchConcerts(1, search, filterStatus, filterCity)}
            className="text-sm text-blue-600 hover:underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Concerts Grid — Figma: 3-col grid with image cards */}
      {!isLoading && !error && concerts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {concerts.map((event) => {
              const sold =
                event.ticketTypes?.length > 0
                  ? Math.round(
                      (event.ticketTypes.reduce(
                        (s, t) => s + t.soldQuantity,
                        0,
                      ) /
                        event.ticketTypes.reduce(
                          (s, t) => s + t.totalQuantity,
                          0,
                        )) *
                        100,
                    )
                  : 0;
              return (
                <div
                  key={event.id}
                  className="bg-white border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors cursor-pointer"
                  onClick={() => openView(event)}
                >
                  <div className="relative h-40">
                    {event.coverImageUrl ? (
                      <img
                        src={event.coverImageUrl}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3
                      style={D}
                      className="text-lg font-black uppercase text-gray-900 mb-1"
                    >
                      {event.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {new Date(event.date).toLocaleDateString("vi-VN")} ·{" "}
                      {event.venue}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">
                        Đã bán {sold}%
                      </span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-[#CCFF00]"
                        style={{ width: `${sold}%` }}
                      />
                    </div>
                    <div
                      className="flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openEdit(event)}
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit size={12} /> Sửa
                      </button>
                      <button
                        onClick={() => setDeletingConcert(event)}
                        className="px-3 py-2 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination — server-side */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị{" "}
              <span className="font-semibold text-gray-900">
                {(currentPage - 1) * LIMIT + 1}
              </span>{" "}
              đến{" "}
              <span className="font-semibold text-gray-900">
                {Math.min(currentPage * LIMIT, total)}
              </span>{" "}
              trong số{" "}
              <span className="font-semibold text-gray-900">{total}</span>{" "}
              concert
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-400 bg-gray-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`flex items-center justify-center w-8 h-8 border text-sm font-medium transition-colors ${
                    p === currentPage
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages}
                className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-400 bg-gray-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
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
          <button
            onClick={openCreate}
            className="bg-gray-900 text-white font-bold text-sm px-6 py-3 hover:bg-gray-800 transition-colors"
          >
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
          onSwitchToEdit={() => {
            if (modalConcert) setModalMode("edit");
          }}
        />
      )}

      {/* Delete Confirm — Figma style */}
      {deletingConcert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeletingConcert(null)}
          />
          <div className="relative bg-white w-full max-w-sm">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2
                style={D}
                className="text-xl font-black uppercase italic text-gray-900"
              >
                Xóa Concert
              </h2>
              <button
                onClick={() => setDeletingConcert(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Bạn có chắc muốn xóa{" "}
                <strong className="text-gray-900">
                  {deletingConcert.name}
                </strong>
                ? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingConcert(null)}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
