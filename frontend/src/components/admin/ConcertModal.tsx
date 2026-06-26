'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { fmt } from '../../utils/format';
import type { Concert, TicketType, CreateTicketTypePayload } from '../../types';

type ModalMode = 'view' | 'create' | 'edit';

type FormState = {
  name: string;
  subtitle: string;
  description: string;
  venue: string;
  city: string;
  date: string;
  openTime: string;
  coverImageUrl: string;
};

const EMPTY_FORM: FormState = {
  name: '', subtitle: '', description: '', venue: '', city: '', date: '', openTime: '', coverImageUrl: '',
};

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

/* Figma-exact input styling — sharp corners, NO rounded */
const inputCls =
  'w-full px-4 py-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-400';
const labelCls = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2';

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  ONGOING:  'text-blue-700 bg-blue-50 border-blue-200',
  COMPLETED:'text-slate-500 bg-slate-100 border-slate-200',
  CANCELLED:'text-red-600 bg-red-50 border-red-200',
};
const STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Sắp diễn', ONGOING: 'Đang diễn', COMPLETED: 'Đã kết thúc', CANCELLED: 'Đã huỷ',
};

function MiniBar({ pct }: { pct: number }) {
  return (
    <div className="w-16 h-1.5 bg-slate-200 overflow-hidden shrink-0">
      <div className="h-full transition-all duration-300 bg-blue-400" style={{ width: `${pct}%` }} />
    </div>
  );
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type Props = {
  mode: ModalMode;
  concert?: Concert | null;
  onClose: () => void;
  onSaved?: () => void;
  onSwitchToEdit?: () => void;
};

// ─── Blank ticket type form ──────────────────────────────────────────────────
const EMPTY_TYPE: CreateTicketTypePayload = {
  name: '', price: 0, totalQuantity: 0, maxPerUser: 2, colorCode: '#6366f1',
};

export default function ConcertModal({ mode, concert, onClose, onSaved, onSwitchToEdit }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Ticket type editor state ───────────────────────────────────────────────
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [addingType, setAddingType] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeForm, setTypeForm] = useState<CreateTicketTypePayload>(EMPTY_TYPE);
  const [typeLoading, setTypeLoading] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  useEffect(() => {
    if (concert && mode !== 'create') {
      setForm({
        name: concert.name,
        subtitle: concert.subtitle ?? '',
        description: concert.description,
        venue: concert.venue,
        city: concert.city,
        date: concert.date ? new Date(concert.date).toISOString().slice(0, 16) : '',
        openTime: concert.openTime ? new Date(concert.openTime).toISOString().slice(0, 16) : '',
        coverImageUrl: concert.coverImageUrl ?? '',
      });
      setTicketTypes(concert.ticketTypes ?? []);
    } else {
      setForm(EMPTY_FORM);
      setTicketTypes([]);
    }
    // Reset editor state khi modal đổi concert/mode
    setAddingType(false);
    setEditingTypeId(null);
    setTypeForm(EMPTY_TYPE);
    setTypeError(null);
  }, [concert, mode]);

  // ─── Ticket type handlers ────────────────────────────────────────────────────

  const handleAddType = async () => {
    if (!concert) return;
    setTypeLoading(true);
    setTypeError(null);
    try {
      const created = await adminService.createTicketType(concert.id, typeForm);
      setTicketTypes(prev => [...prev, created]);
      setAddingType(false);
      setTypeForm(EMPTY_TYPE);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setTypeError(msg ?? 'Thêm loại vé thất bại');
    } finally {
      setTypeLoading(false);
    }
  };

  const handleUpdateType = async (typeId: string) => {
    if (!concert) return;
    setTypeLoading(true);
    setTypeError(null);
    try {
      const updated = await adminService.updateTicketType(concert.id, typeId, typeForm);
      setTicketTypes(prev => prev.map(t => t.id === typeId ? { ...t, ...updated } : t));
      setEditingTypeId(null);
      setTypeForm(EMPTY_TYPE);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setTypeError(msg ?? 'Cập nhật loại vé thất bại');
    } finally {
      setTypeLoading(false);
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!concert || !confirm('Xóa loại vé này?')) return;
    setTypeLoading(true);
    setTypeError(null);
    try {
      await adminService.deleteTicketType(concert.id, typeId);
      setTicketTypes(prev => prev.filter(t => t.id !== typeId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setTypeError(msg ?? 'Xóa loại vé thất bại');
    } finally {
      setTypeLoading(false);
    }
  };

  const startEdit = (t: TicketType) => {
    setEditingTypeId(t.id);
    setAddingType(false);
    setTypeForm({ name: t.name, price: t.price, totalQuantity: t.totalQuantity, maxPerUser: t.maxPerUser, colorCode: t.colorCode });
    setTypeError(null);
  };

  const cancelTypeEdit = () => {
    setEditingTypeId(null);
    setAddingType(false);
    setTypeForm(EMPTY_TYPE);
    setTypeError(null);
  };


  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const payload = {
        name: form.name,
        subtitle: form.subtitle || undefined,
        description: form.description,
        venue: form.venue,
        city: form.city,
        date: form.date,
        openTime: form.openTime,
        coverImageUrl: form.coverImageUrl || undefined,
      };
      if (mode === 'edit' && concert) {
        await adminService.updateConcert(concert.id, payload);
      } else {
        await adminService.createConcert(payload);
      }
      onSaved?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? (mode === 'edit' ? 'Cập nhật thất bại' : 'Tạo concert thất bại'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    /* Figma: fixed overlay with bg-black/50 backdrop-blur-sm */
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Header — Figma exact: sticky, border-b, title + X */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 style={D} className="text-2xl font-black uppercase italic text-gray-900">
            {mode === 'view' ? 'Chi tiết Concert' : mode === 'edit' ? 'Chỉnh sửa Concert' : 'Thêm Concert mới'}
          </h2>
          <div className="flex items-center gap-2">
            {mode === 'view' && onSwitchToEdit && (
              <button onClick={onSwitchToEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                <Pencil size={13} /> Chỉnh sửa
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* VIEW MODE — same layout as create/edit but read-only */}
        {mode === 'view' && concert && (
          <div className="p-6 space-y-6">
            {/* Cover image — compact banner if exists */}
            {concert.coverImageUrl && (
              <Link href={`/concert/${concert.id}`} className="block relative h-40 overflow-hidden group">
                <img src={concert.coverImageUrl} alt={concert.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-3 right-4 text-[10px] font-semibold text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">Xem trang công khai ↗</span>
              </Link>
            )}

            {/* Row 1 — Name + Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tên concert</label>
                <p className="text-sm font-semibold text-gray-900">{concert.name}</p>
              </div>
              <div>
                <label className={labelCls}>Trạng thái</label>
                <span className={`inline-block text-[11px] font-semibold border px-2.5 py-1 ${STATUS_STYLE[concert.status] ?? ''}`}>
                  {STATUS_LABEL[concert.status] ?? concert.status}
                </span>
              </div>
            </div>

            {/* Row 2 — Subtitle */}
            {concert.subtitle && (
              <div>
                <label className={labelCls}>Phụ đề</label>
                <p className="text-sm text-gray-600">{concert.subtitle}</p>
              </div>
            )}

            {/* Row 3 — Venue + City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Địa điểm</label>
                <p className="text-sm text-gray-900">{concert.venue}</p>
              </div>
              <div>
                <label className={labelCls}>Thành phố</label>
                <p className="text-sm text-gray-900">{concert.city}</p>
              </div>
            </div>

            {/* Row 4 — Date + Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Ngày diễn</label>
                <p className="text-sm text-gray-900">
                  {new Date(concert.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <label className={labelCls}>Mở bán lúc</label>
                <p className="text-sm text-gray-900">
                  {new Date(concert.openTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <label className={labelCls}>Giờ diễn</label>
                <p className="text-sm text-gray-900">
                  {new Date(concert.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Row 5 — Description */}
            <div>
              <label className={labelCls}>Mô tả</label>
              <p className="text-sm text-gray-600 leading-relaxed">{concert.description}</p>
            </div>



            {/* Row 7 — Ticket Types (read-only) */}
            {ticketTypes.length > 0 && (
              <div>
                <label className={labelCls}>Loại vé ({ticketTypes.length})</label>
                <div className="flex flex-col gap-1.5">
                  {ticketTypes.map(t => {
                    const remaining = t.totalQuantity - t.soldQuantity;
                    const pct = t.totalQuantity > 0 ? Math.round((t.soldQuantity / t.totalQuantity) * 100) : 0;
                    return (
                      <div key={t.id} className="grid grid-cols-[auto_1fr_80px_40px_90px] items-center gap-3 bg-gray-50 px-4 py-2.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: t.colorCode || '#3b82f6' }} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                          <div className="text-[11px] text-gray-400">Còn {remaining} · Tối đa {t.maxPerUser}/người</div>
                        </div>
                        <MiniBar pct={pct} />
                        <span className="text-[11px] font-semibold text-gray-500 text-right">{pct}%</span>
                        <span className="text-sm font-bold text-gray-800 text-right">{fmt(t.price)}đ</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer — same style as create/edit actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-[11px] text-gray-400">
                Tạo {fmtTime(concert.createdAt)}
                {concert.updatedAt && concert.updatedAt !== concert.createdAt && <span> · Sửa {fmtTime(concert.updatedAt)}</span>}
              </div>
              <button onClick={onClose}
                className="px-6 py-3 border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* CREATE / EDIT MODE — Figma exact form structure */}
        {mode !== 'view' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tên concert *</label>
                <input type="text" required value={form.name} onChange={set('name')} className={inputCls} placeholder="ANH TRAI SAY HI" />
              </div>
              <div>
                <label className={labelCls}>Phụ đề</label>
                <input type="text" value={form.subtitle} onChange={set('subtitle')} className={inputCls} placeholder="ATSH Concert 2026" />
              </div>
            </div>

            {/* Row 2 — Venue + City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Địa điểm *</label>
                <input type="text" required value={form.venue} onChange={set('venue')} className={inputCls} placeholder="Sân Vận Động Mỹ Đình" />
              </div>
              <div>
                <label className={labelCls}>Thành phố *</label>
                <input type="text" required value={form.city} onChange={set('city')} className={inputCls} placeholder="Hà Nội" />
              </div>
            </div>

            {/* Row 3 — Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Mở bán vé lúc *</label>
                <input type="datetime-local" required value={form.openTime} onChange={set('openTime')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ngày giờ diễn *</label>
                <input type="datetime-local" required value={form.date} onChange={set('date')} className={inputCls} />
              </div>
            </div>

            {/* Row 4 — Description */}
            <div>
              <label className={labelCls}>Mô tả chi tiết *</label>
              <textarea value={form.description} onChange={set('description')} rows={6} className={`${inputCls} resize-none`} placeholder="Mô tả chi tiết về sự kiện..." />
              {mode === 'edit' && (
                <p className="text-xs text-gray-500 mt-2">
                  Muốn tóm tắt tài liệu PDF (Press kit/Bio) tự động bằng AI và nối vào mô tả? Vào menu{' '}
                  <Link href="/admin/ai-bio" className="text-blue-600 hover:underline font-medium">Tạo mô tả bằng AI</Link>.
                </p>
              )}
            </div>

            {/* Row 5 — Cover URL */}
            <div>
              <label className={labelCls}>URL ảnh</label>
              <input type="url" value={form.coverImageUrl} onChange={set('coverImageUrl')} className={inputCls} placeholder="https://..." />
            </div>

            {/* Row 7 — Ticket Types (chỉ hiển thị khi edit concert đã tồn tại) */}
            {mode === 'edit' && concert && (
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>Loại vé ({ticketTypes.length})</label>
                  {!addingType && !editingTypeId && (
                    <button type="button" onClick={() => { setAddingType(true); setTypeForm(EMPTY_TYPE); setTypeError(null); }}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 border border-gray-200 px-2.5 py-1 hover:bg-gray-50 transition-colors">
                      <Plus size={11} /> Thêm loại vé
                    </button>
                  )}
                </div>

                {typeError && (
                  <div className="bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 font-medium mb-2">{typeError}</div>
                )}

                <div className="flex flex-col gap-1.5">
                  {ticketTypes.map(t => {
                    const remaining = t.totalQuantity - t.soldQuantity;
                    const pct = t.totalQuantity > 0 ? Math.round((t.soldQuantity / t.totalQuantity) * 100) : 0;
                    if (editingTypeId === t.id) {
                      return (
                        <div key={t.id} className="border border-gray-300 bg-gray-50 p-3 flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tên loại vé *</label>
                              <input value={typeForm.name} onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white focus:outline-none focus:border-gray-400" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Giá (VNĐ) *</label>
                              <input type="number" min={0} value={typeForm.price} onChange={e => setTypeForm(p => ({ ...p, price: Number(e.target.value) }))}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white focus:outline-none focus:border-gray-400" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tổng SL * (đã bán: {t.soldQuantity})</label>
                              <input type="number" min={t.soldQuantity || 1} value={typeForm.totalQuantity} onChange={e => setTypeForm(p => ({ ...p, totalQuantity: Number(e.target.value) }))}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white focus:outline-none focus:border-gray-400" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Max/người</label>
                              <input type="number" min={1} max={10} value={typeForm.maxPerUser} onChange={e => setTypeForm(p => ({ ...p, maxPerUser: Number(e.target.value) }))}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white focus:outline-none focus:border-gray-400" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Màu</label>
                            <input type="color" value={typeForm.colorCode} onChange={e => setTypeForm(p => ({ ...p, colorCode: e.target.value }))}
                              className="h-7 w-10 border border-gray-200 cursor-pointer" />
                            <span className="text-xs text-gray-500">{typeForm.colorCode}</span>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button type="button" onClick={cancelTypeEdit} className="px-3 py-1.5 text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">Hủy</button>
                            <button type="button" onClick={() => handleUpdateType(t.id)} disabled={typeLoading}
                              className="px-3 py-1.5 text-xs font-bold bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
                              {typeLoading ? 'Đang lưu...' : 'Lưu'}
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={t.id} className="grid grid-cols-[auto_1fr_80px_40px_90px_auto] items-center gap-3 bg-gray-50 px-4 py-2.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: t.colorCode || '#3b82f6' }} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                          <div className="text-[11px] text-gray-400">Còn {remaining} · Tối đa {t.maxPerUser}/người</div>
                        </div>
                        <MiniBar pct={pct} />
                        <span className="text-[11px] font-semibold text-gray-500 text-right">{pct}%</span>
                        <span className="text-sm font-bold text-gray-800 text-right">{fmt(t.price)}đ</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => startEdit(t)} title="Sửa"
                            className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><Pencil size={13} /></button>
                          <button type="button" onClick={() => handleDeleteType(t.id)} disabled={typeLoading} title="Xóa"
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    );
                  })}

                  {ticketTypes.length === 0 && !addingType && (
                    <p className="text-xs text-gray-400 py-2">Chưa có loại vé nào.</p>
                  )}

                  {addingType && (
                    <div className="border border-gray-300 bg-gray-50 p-3 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tên loại vé *</label>
                          <input value={typeForm.name} onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white focus:outline-none focus:border-gray-400" placeholder="VIP" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Giá (VNĐ) *</label>
                          <input type="number" min={0} value={typeForm.price} onChange={e => setTypeForm(p => ({ ...p, price: Number(e.target.value) }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white focus:outline-none focus:border-gray-400" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tổng số lượng *</label>
                          <input type="number" min={1} value={typeForm.totalQuantity} onChange={e => setTypeForm(p => ({ ...p, totalQuantity: Number(e.target.value) }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white focus:outline-none focus:border-gray-400" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Max/người</label>
                          <input type="number" min={1} max={10} value={typeForm.maxPerUser} onChange={e => setTypeForm(p => ({ ...p, maxPerUser: Number(e.target.value) }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white focus:outline-none focus:border-gray-400" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Màu</label>
                        <input type="color" value={typeForm.colorCode} onChange={e => setTypeForm(p => ({ ...p, colorCode: e.target.value }))}
                          className="h-7 w-10 border border-gray-200 cursor-pointer" />
                        <span className="text-xs text-gray-500">{typeForm.colorCode}</span>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={cancelTypeEdit} className="px-3 py-1.5 text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">Hủy</button>
                        <button type="button" onClick={handleAddType} disabled={typeLoading || !typeForm.name}
                          className="px-3 py-1.5 text-xs font-bold bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
                          {typeLoading ? 'Đang thêm...' : 'Thêm'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium">{error}</div>
            )}

            {/* Actions — Figma exact: flex gap-3, border-t */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button type="button" onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 px-6 py-3 bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading
                  ? (mode === 'edit' ? 'Đang cập nhật...' : 'Đang tạo...')
                  : (mode === 'edit' ? 'Lưu thay đổi' : 'Thêm concert')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
