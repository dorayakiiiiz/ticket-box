'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, MapPin, Calendar, Clock, Sparkles, Pencil, Music2, FileText, Upload, Loader2, CheckCircle, XCircle, Type } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { fmt } from '../../utils/format';
import type { Concert, AiBioStatus } from '../../types';

// --- Types & Constants ---

type ModalMode = 'view' | 'create' | 'edit';

type FormState = {
  name: string;
  subtitle: string;
  description: string;
  venue: string;
  city: string;
  date: string;
  coverImageUrl: string;
  aiBio: string;
};

const EMPTY_FORM: FormState = {
  name: '', subtitle: '', description: '', venue: '', city: '', date: '', coverImageUrl: '', aiBio: '',
};

// Kích thước tối đa file PDF cho phép upload
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

const inputCls =
  'w-full bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all duration-200';
const labelCls = 'text-sm font-medium text-slate-700';

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

// --- Mini progress bar for ticket types ---
function MiniBar({ pct }: { pct: number }) {
  return (
    <div className="w-16 h-1.5 bg-slate-200 overflow-hidden shrink-0">
      <div className="h-full transition-all duration-300 bg-blue-400" style={{ width: `${pct}%` }} />
    </div>
  );
}

// --- Format timestamp for footer ---
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// --- Props ---
type Props = {
  mode: ModalMode;
  concert?: Concert | null;
  onClose: () => void;
  onSaved?: () => void;
  onSwitchToEdit?: () => void;
};

export default function ConcertModal({ mode, concert, onClose, onSaved, onSwitchToEdit }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Bio: 'manual' = nhập tay, 'pdf' = upload PDF
  const [bioMode, setBioMode] = useState<'manual' | 'pdf'>('manual');

  // PDF upload state (chỉ dùng khi bioMode === 'pdf' và concert đã tồn tại)
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [bioStatus, setBioStatus] = useState<AiBioStatus>('IDLE');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (concert && mode !== 'create') {
      setForm({
        name: concert.name,
        subtitle: concert.subtitle ?? '',
        description: concert.description,
        venue: concert.venue,
        city: concert.city,
        date: concert.date ? new Date(concert.date).toISOString().slice(0, 16) : '',
        coverImageUrl: concert.coverImageUrl ?? '',
        aiBio: concert.aiBio ?? '',
      });
      setBioStatus(concert.aiBioStatus ?? 'IDLE');
      // Nếu đã có AI Bio thì mở tab nhập tay, chưa có thì mở PDF
      setBioMode(concert.aiBio ? 'manual' : 'pdf');
    } else {
      setForm(EMPTY_FORM);
      setBioMode('manual');
      setBioStatus('IDLE');
    }
  }, [concert, mode]);

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
        coverImageUrl: form.coverImageUrl || undefined,
        // Chỉ gửi aiBio khi nhập tay, không ghi đè nếu đang dùng PDF mode
        ...(bioMode === 'manual' && form.aiBio ? { aiBio: form.aiBio } : {}),
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

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Handler upload PDF — chỉ hoạt động khi concert đã được tạo (có id)
  const handlePdfUpload = async (file: File) => {
    if (!concert?.id) return;
    setUploadError(null);

    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      setUploadError('Chỉ chấp nhận file PDF');
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      setUploadError('File không được vượt quá 10MB');
      return;
    }

    setIsUploading(true);
    setBioStatus('PROCESSING');
    try {
      await adminService.uploadBio(concert.id, file);
      // Poll trạng thái mỗi 3 giây cho đến khi DONE/FAILED
      const poll = setInterval(async () => {
        try {
          const updated = await adminService.getConcerts();
          const c = updated.find(x => x.id === concert.id);
          if (c && (c.aiBioStatus === 'DONE' || c.aiBioStatus === 'FAILED')) {
            clearInterval(poll);
            setBioStatus(c.aiBioStatus);
            if (c.aiBioStatus === 'DONE') setForm(prev => ({ ...prev, aiBio: c.aiBio ?? '' }));
            setIsUploading(false);
          }
        } catch { clearInterval(poll); setIsUploading(false); }
      }, 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setUploadError(msg ?? 'Upload thất bại, thử lại sau');
      setBioStatus('FAILED');
      setIsUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };


  // --- Header config ---
  const HEADER: Record<ModalMode, { icon: React.ReactNode; title: string; desc: string }> = {
    view: {
      icon: <div className="w-9 h-9 bg-blue-50 flex items-center justify-center shrink-0"><Music2 size={16} className="text-blue-500" /></div>,
      title: 'Chi tiết Concert',
      desc: 'Thông tin chi tiết sự kiện',
    },
    create: {
      icon: <div className="w-9 h-9 bg-emerald-50 flex items-center justify-center shrink-0"><Music2 size={16} className="text-emerald-500" /></div>,
      title: 'Tạo Concert Mới',
      desc: 'Điền thông tin để tạo sự kiện',
    },
    edit: {
      icon: <div className="w-9 h-9 bg-amber-50 flex items-center justify-center shrink-0"><Pencil size={16} className="text-amber-500" /></div>,
      title: 'Chỉnh sửa Concert',
      desc: 'Cập nhật thông tin sự kiện',
    },
  };

  const h = HEADER[mode];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="button"
      tabIndex={0}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        className="bg-white w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={h.title}
      >
        {/* ===== HEADER — unified across all 3 modes ===== */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {h.icon}
            <div>
              <h2 className="text-base font-bold text-slate-900">{h.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{h.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {mode === 'view' && onSwitchToEdit && (
              <button
                onClick={onSwitchToEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Pencil size={13} />
                Chỉnh sửa
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 transition-colors" aria-label="Đóng">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ===== VIEW MODE ===== */}
        {mode === 'view' && concert && (
          <div>
            {/* Cover image — click to go to public page */}
            {concert.coverImageUrl && (
              <Link href={`/concert/${concert.id}`} className="block relative h-44 overflow-hidden group">
                <img src={concert.coverImageUrl} alt={concert.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className="absolute bottom-3 right-4 text-[10px] font-semibold text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">Xem trang công khai ↗</span>
              </Link>
            )}

            <div className="px-6 py-5">
              {/* Name + status badge */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">{concert.name}</h3>
                  {concert.subtitle && <p className="text-sm text-slate-400 mt-0.5">{concert.subtitle}</p>}
                </div>
                <span className={`text-[11px] font-semibold border px-2.5 py-1 shrink-0 ${STATUS_STYLE[concert.status] ?? ''}`}>
                  {STATUS_LABEL[concert.status] ?? concert.status}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                {[
                  { icon: <MapPin size={14} />, label: 'Địa điểm', value: concert.venue },
                  { icon: <MapPin size={14} />, label: 'Thành phố', value: concert.city },
                  { icon: <Calendar size={14} />, label: 'Ngày diễn', value: new Date(concert.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) },
                  { icon: <Clock size={14} />, label: 'Giờ diễn', value: new Date(concert.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-2.5">
                    <span className="text-slate-400">{icon}</span>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
                      <div className="text-sm font-semibold text-slate-800">{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-1.5">Mô tả</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{concert.description}</p>
              </div>

              {/* AI Bio */}
              {concert.aiBio && (
                <div className="mb-5 bg-slate-50 border border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={13} className="text-blue-400" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">AI Bio</h4>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed italic">{concert.aiBio}</p>
                </div>
              )}

              {/* Ticket types with progress bars */}
              {concert.ticketTypes?.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Loại vé ({concert.ticketTypes.length})</h4>
                  <div className="flex flex-col gap-1.5">
                    {concert.ticketTypes.map(t => {
                      const remaining = t.totalQuantity - t.soldQuantity;
                      const pct = t.totalQuantity > 0 ? Math.round((t.soldQuantity / t.totalQuantity) * 100) : 0;
                      return (
                        <div key={t.id} className="grid grid-cols-[auto_1fr_80px_40px_90px] items-center gap-3 bg-slate-50 px-4 py-2.5">
                          <div className="w-2.5 h-2.5" style={{ backgroundColor: t.colorCode || '#3b82f6' }} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800">{t.name}</div>
                            <div className="text-[11px] text-slate-400">Còn {remaining} · Tối đa {t.maxPerUser}/người</div>
                          </div>
                          <MiniBar pct={pct} />
                          <span className="text-[11px] font-semibold text-slate-500 text-right">{pct}%</span>
                          <span className="text-sm font-bold text-slate-800 text-right">{fmt(t.price)}đ</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer — metadata + close */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <div className="text-[11px] text-slate-400">
                  Tạo {fmtTime(concert.createdAt)}
                  {concert.updatedAt && concert.updatedAt !== concert.createdAt && (
                    <span> · Sửa {fmtTime(concert.updatedAt)}</span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="px-5 border border-slate-200 text-sm font-semibold text-slate-500 py-2 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== CREATE / EDIT MODE ===== */}
        {mode !== 'view' && (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-name" className={labelCls}>Tên concert <span className="text-red-500">*</span></label>
              <input id="modal-name" type="text" value={form.name} onChange={set('name')} required placeholder="VD: Anh Trai Say Hi Concert 2026" className={inputCls} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-subtitle" className={labelCls}>Subtitle</label>
              <input id="modal-subtitle" type="text" value={form.subtitle} onChange={set('subtitle')} placeholder="VD: WORLD TOUR 2026" className={inputCls} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-description" className={labelCls}>Mô tả <span className="text-red-500">*</span></label>
              <textarea id="modal-description" value={form.description} onChange={set('description')} required rows={3} placeholder="Mô tả ngắn về concert..." className={`${inputCls} resize-none`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-venue" className={labelCls}>Địa điểm <span className="text-red-500">*</span></label>
                <input id="modal-venue" type="text" value={form.venue} onChange={set('venue')} required placeholder="VD: SVĐ Mỹ Đình" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-city" className={labelCls}>Thành phố <span className="text-red-500">*</span></label>
                <input id="modal-city" type="text" value={form.city} onChange={set('city')} required placeholder="VD: Hà Nội" className={inputCls} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-date" className={labelCls}>Ngày diễn <span className="text-red-500">*</span></label>
              <input id="modal-date" type="datetime-local" value={form.date} onChange={set('date')} required className={inputCls} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-cover" className={labelCls}>Cover Image URL</label>
              <input id="modal-cover" type="url" value={form.coverImageUrl} onChange={set('coverImageUrl')} placeholder="https://..." className={inputCls} />
            </div>

            {/* ── AI Bio Section ── */}
            <div className="border border-slate-200 overflow-hidden">
              {/* Header + Tab switcher */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-blue-400" />
                  <span className="text-sm font-semibold text-slate-700">AI Tiểu sử nghệ sĩ</span>
                  <span className="text-[10px] text-slate-400 font-normal">(tuỳ chọn)</span>
                </div>
                {/* Tab switcher */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5">
                  <button
                    type="button"
                    onClick={() => setBioMode('manual')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ${
                      bioMode === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Type size={11} /> Nhập tay
                  </button>
                  <button
                    type="button"
                    onClick={() => setBioMode('pdf')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ${
                      bioMode === 'pdf'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <FileText size={11} /> Upload PDF
                  </button>
                </div>
              </div>

              <div className="p-4">
                {/* Tab: Nhập tay */}
                {bioMode === 'manual' && (
                  <div className="flex flex-col gap-1.5">
                    <textarea
                      id="modal-aibio"
                      value={form.aiBio}
                      onChange={set('aiBio')}
                      rows={4}
                      placeholder="Nhập tiểu sử nghệ sĩ... (hoặc để trống và dùng AI để tự động tóm tắt từ PDF)"
                      className={`${inputCls} resize-none`}
                    />
                    <p className="text-[11px] text-slate-400">Nội dung này sẽ hiển thị trong trang chi tiết concert.</p>
                  </div>
                )}

                {/* Tab: Upload PDF */}
                {bioMode === 'pdf' && (
                  <div>
                    {/* Chỉ upload được khi concert đã tồn tại */}
                    {!concert?.id && (
                      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-3.5 py-3 text-xs text-amber-700">
                        <span className="shrink-0 mt-0.5">⚠️</span>
                        <span>Hãy <strong>tạo concert trước</strong>, sau đó mở lại để upload PDF. AI sẽ tự động tóm tắt tiểu sử nghệ sĩ.</span>
                      </div>
                    )}

                    {/* PROCESSING */}
                    {concert?.id && (bioStatus === 'PROCESSING' || isUploading) && (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <Loader2 size={24} className="animate-spin text-blue-500" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-700">AI đang xử lý...</p>
                          <p className="text-xs text-slate-400 mt-0.5">Đọc PDF và tóm tắt bằng AI, thường mất 10–30 giây</p>
                        </div>
                      </div>
                    )}

                    {/* DONE */}
                    {concert?.id && bioStatus === 'DONE' && !isUploading && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                          <CheckCircle size={15} /> AI Bio đã sẵn sàng
                        </div>
                        {form.aiBio && (
                          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 px-3 py-2.5 italic leading-relaxed line-clamp-3">
                            {form.aiBio}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => pdfInputRef.current?.click()}
                          className="self-start text-[11px] text-blue-500 hover:text-blue-700 font-medium underline transition-colors"
                        >
                          Upload PDF khác
                        </button>
                      </div>
                    )}

                    {/* IDLE / FAILED — Drop zone */}
                    {concert?.id && (bioStatus === 'IDLE' || bioStatus === 'FAILED') && !isUploading && (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const f = e.dataTransfer.files[0];
                          if (f) handlePdfUpload(f);
                        }}
                        className={`flex flex-col items-center gap-3 py-7 border-2 border-dashed cursor-pointer transition-all duration-200 ${
                          isDragging
                            ? 'border-blue-400 bg-blue-50'
                            : bioStatus === 'FAILED'
                            ? 'border-red-300 bg-red-50'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                        onClick={() => pdfInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && pdfInputRef.current?.click()}
                        aria-label="Khu vực kéo thả hoặc chọn file PDF"
                      >
                        {bioStatus === 'FAILED' ? (
                          <XCircle size={22} className="text-red-400" />
                        ) : (
                          <Upload size={22} className={isDragging ? 'text-blue-500' : 'text-slate-300'} />
                        )}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-600">
                            {bioStatus === 'FAILED' ? 'Xử lý thất bại — thử lại' : 'Kéo thả PDF vào đây'}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">hoặc <span className="text-blue-500 underline">chọn file</span> · tối đa 10MB</p>
                        </div>
                      </div>
                    )}

                    {/* Lỗi upload */}
                    {uploadError && (
                      <p role="alert" className="mt-2 text-[11px] text-red-500 font-medium">{uploadError}</p>
                    )}

                    {/* Hidden file input */}
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      aria-hidden="true"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePdfUpload(f);
                        e.target.value = '';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium">{error}</div>
            )}


            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white font-semibold text-sm py-3 hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? (mode === 'edit' ? 'Đang cập nhật...' : 'Đang tạo...')
                  : (mode === 'edit' ? 'Cập nhật' : 'Tạo Concert')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 border border-slate-200 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
              >
                Huỷ
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
