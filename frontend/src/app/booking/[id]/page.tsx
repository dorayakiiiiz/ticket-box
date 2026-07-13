'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';
import { concertService, availabilityFetcher } from '@/services/concertService';
import { bookingService } from '@/services/bookingService';
import { useAuthStore } from '@/stores/authStore';
import type { Concert, ConcertAvailability, TicketType } from '@/types';
import { fmt } from '@/utils/format';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

// SeatMap Page
export default function SeatMapPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string; // UUID concert
  const { isAuthenticated } = useAuthStore();

  const [concert, setConcert] = useState<Concert | null>(null);
  const [sel, setSel] = useState<(TicketType & { available: number; soldOut: boolean }) | null>(null);
  const [qty, setQty] = useState(1);

  // Booking Flow State
  const [bookingState, setBookingState] = useState<'idle' | 'submitting' | 'polling' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const idempotencyKeyRef = useRef<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const pollFailCount = useRef(0);

  // Khởi tạo key 1 lần duy nhất khi mount, lưu vào sessionStorage để hỗ trợ nhiều tab/reload
  useEffect(() => {
    const keyName = `booking_intent_${id}`;
    let key = sessionStorage.getItem(keyName);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(keyName, key);
    }
    idempotencyKeyRef.current = key;

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  const resetIdempotencyKey = useCallback(() => {
    const newKey = crypto.randomUUID();
    sessionStorage.setItem(`booking_intent_${id}`, newKey);
    idempotencyKeyRef.current = newKey;
  }, [id]);

  const handleBooking = useCallback(async () => {
    if (!sel || !isAuthenticated) {
      if (!isAuthenticated) setErrorMsg('Vui lòng đăng nhập để đặt vé.');
      return;
    }
    if (!captchaToken) {
      setErrorMsg('Vui lòng xác minh Captcha (Tick chọn ô bên dưới).');
      return;
    }
    setBookingState('submitting');
    setErrorMsg('');

    try {
      const result = await bookingService.createBooking(sel.id, qty, idempotencyKeyRef.current!, captchaToken);
      setBookingState('polling');
      pollFailCount.current = 0;

      pollRef.current = setInterval(async () => {
        try {
          const status = await bookingService.checkStatus(result.idempotencyKey);
          if (status.status === 'completed' && status.orderId) {
            if (pollRef.current) clearInterval(pollRef.current);
            // Thành công -> Sang trang Checkout để thanh toán, truyền theo orderId
            router.push(`/checkout/${id}?ticketTypeId=${sel.id}&qty=${qty}&orderId=${status.orderId}`);
          } else if (status.status === 'failed') {
            // Trường hợp backend chủ động trả về failed
            if (pollRef.current) clearInterval(pollRef.current);
            setBookingState('error');
            setErrorMsg('Đã có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
            resetIdempotencyKey();
          }
        } catch (e) {
          // Xử lý lỗi khi polling (ví dụ: network error)
          pollFailCount.current += 1;
          if (pollFailCount.current >= 5) {
            if (pollRef.current) clearInterval(pollRef.current);
            setBookingState('error');
            setErrorMsg('Lỗi kết nối khi đang tạo đơn. Vui lòng kiểm tra lại kết nối và thử lại.');
            resetIdempotencyKey();
            turnstileRef.current?.reset();
          }
        }
      }, 2000);
    } catch (err: any) {
      setBookingState('error');
      resetIdempotencyKey(); // Sinh key mới để thử lại
      turnstileRef.current?.reset(); // <== Bắt buộc phải reset Captcha vì Token chỉ dùng được 1 lần!

      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (!err.response) {
        setErrorMsg(`Lỗi Mạng/CORS: Không thể kết nối đến máy chủ. Chi tiết: ${err.message}`);
      } else if (status === 429) {
        setErrorMsg('Bạn thao tác quá nhanh, vui lòng thử lại.');
      } else if (status === 409) {
        setErrorMsg('Yêu cầu đang xử lý, không bấm lại.');
      } else if (status === 400) {
        setErrorMsg(msg || 'Hết vé hoặc vượt giới hạn.');
      } else if (status === 401) {
        setErrorMsg('Vui lòng đăng nhập để đặt vé.');
      } else if (status === 403) {
        setErrorMsg(msg || 'Bị từ chối truy cập (Lỗi Captcha).');
      } else if (status === 500) {
        setErrorMsg(`Lỗi Server (500): ${msg || 'Internal Server Error'}. Hãy check log server Backend!`);
      } else {
        setErrorMsg(`Lỗi hệ thống (${status}): ${msg || 'Vui lòng thử lại sau.'}`);
      }
    }
  }, [sel, qty, isAuthenticated, id, router, captchaToken]);

  // Fetch concert data (tên, venue, date, ticketTypes) từ Postgres
  useEffect(() => {
    if (!id) return;
    concertService.getById(id).then((c) => {
      if (c.openTime && new Date() < new Date(c.openTime)) {
        router.push(`/concert/${id}`);
      } else {
        setConcert(c);
      }
    }).catch(() => { });
  }, [id, router]);

  // SWR poll availability mỗi 5s — cập nhật số vé real-time từ Redis
  const { data: availability } = useSWR<ConcertAvailability>(
    id ? `/concerts/${id}/availability` : null,
    availabilityFetcher,
    { refreshInterval: 5000 },
  );

  if (!concert) {
    return <div className="min-h-screen pt-20 text-center text-gray-500">Đang tải...</div>;
  }

  // Merge availability (Redis real-time) vào ticketTypes (Postgres)
  const ticketTypes = concert.ticketTypes.map((tt) => {
    const avail = availability?.ticketTypes?.find((a) => a.id === tt.id);
    return {
      ...tt,
      available: avail ? avail.available : tt.totalQuantity - tt.soldQuantity,
      soldOut: avail ? avail.soldOut : tt.soldQuantity >= tt.totalQuantity,
    };
  });

  const D = { fontFamily: "'Barlow Condensed', sans-serif" };
  const dateStr = new Date(concert.date).toLocaleDateString('vi-VN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const timeStr = new Date(concert.date).toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
  });

  // maxQty: giới hạn bởi maxPerUser VÀ số vé còn lại
  const maxQty = sel ? Math.min(sel.maxPerUser, sel.available) : 1;

  // ─── ZoneBtn: Nút trên sơ đồ sân khấu ────────────────────────────────────
  // Tìm ticketType theo tên (best-effort matching giữa label trên map và ticketType.name)
  function ZoneBtn({ name, label, rows = 1 }: { name: string; label?: string; rows?: number }) {
    // Tìm ticketType có tên gần giống label trên sơ đồ
    const tt = ticketTypes.find(t =>
      t.name.toUpperCase().includes(name.toUpperCase()) ||
      name.toUpperCase().includes(t.name.toUpperCase())
    );
    // Nếu không match được ticketType nào → hiện nút xám placeholder
    const color = tt?.colorCode || '#555';
    const active = sel && tt && sel.id === tt.id;
    return (
      <button
        onClick={() => { if (tt && !tt.soldOut) { setSel(tt); setQty(1); } }}
        className="flex items-center justify-center text-[9px] md:text-xs font-black uppercase tracking-wider border-2 transition-all hover:brightness-110 py-3 px-1 md:py-4"
        style={{
          backgroundColor: color + '30',
          borderColor: active ? color : color + '60',
          color: color,
          gridRow: rows > 1 ? `span ${rows}` : undefined,
          opacity: tt?.soldOut ? 0.4 : 1,
        }}
      >
        <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{(label ?? name).replace(' — ', '\n')}</span>
      </button>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header bar — giữ nguyên style ban đầu */}
      <div className="border-b border-[#222] bg-[#0a0a0a] px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[11px] md:text-xs font-semibold text-gray-500 hover:text-white uppercase tracking-widest"><ChevronLeft size={14} /> Trở về</button>
        <div className="text-center">
          <div style={D} className="text-lg font-black uppercase italic">{concert.name}</div>
          <div className="text-[10px] md:text-xs text-gray-500">{dateStr} · {concert.venue}</div>
        </div>
        <div className="w-20" />
      </div>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* ────── Seat Map: ảnh sơ đồ từ DB (hoặc fallback) ────── */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 bg-[#0D0D0D]">
          {concert.seatMapImageUrl ? (
            /* Hiển thị ảnh sơ đồ admin đã upload */
            <div className="w-full flex flex-col items-center gap-4">
              <p className="text-[11px] md:text-xs font-mono tracking-[0.2em] text-[#CCFF00] uppercase">
                Chọn khu vực — Tham khảo sơ đồ
              </p>
              {/* Seat map image — full width, click to zoom */}
              <div
                className="w-full relative overflow-hidden border border-white/10 cursor-zoom-in group"
                onClick={() => window.open(concert.seatMapImageUrl!, '_blank')}
                title="Nhấn để xem ảnh đầy đủ"
              >
                <img
                  src={concert.seatMapImageUrl}
                  alt={`Sơ đồ chỗ ngồi ${concert.name}`}
                  className="w-full object-contain transition-transform duration-300 group-hover:scale-[1.02] max-h-[70vh]"
                />
                {/* Hover overlay hint */}
                <div className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/70 border border-white/20 text-[10px] font-mono text-white/80 tracking-widest uppercase">
                    ↗ Phóng to
                  </span>
                </div>
              </div>
              {/* Legend — hiện các loại vé thật từ backend */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                {ticketTypes.map(tt => (
                  <button
                    key={tt.id}
                    onClick={() => { if (!tt.soldOut) { setSel(tt); setQty(1); } }}
                    className={`flex items-center gap-1.5 px-3 py-1 border transition-all ${sel?.id === tt.id
                      ? 'border-white/40 bg-white/10'
                      : tt.soldOut
                        ? 'border-transparent opacity-40 cursor-not-allowed'
                        : 'border-transparent hover:border-white/20 cursor-pointer'
                      }`}
                  >
                    <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: tt.colorCode || '#CCFF00' }} />
                    <span className="text-[9px] md:text-[10px] font-mono text-gray-300">{tt.name}</span>
                    {tt.soldOut && <span className="text-[9px] text-[#FF2D20] font-mono">· Hết</span>}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 font-mono">Nhấn vào tên khu vực để chọn, hoặc chọn từ danh sách bên phải</p>
            </div>
          ) : (
            /* Fallback: chưa có ảnh → hiển thị danh sách zone dạng text */
            <div className="w-full max-w-xl lg:max-w-3xl flex flex-col gap-3">
              <p className="text-[11px] md:text-xs font-mono tracking-[0.2em] text-[#CCFF00] uppercase text-center mb-2">
                Chọn khu vực
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ticketTypes.map(tt => (
                  <button
                    key={tt.id}
                    onClick={() => { if (!tt.soldOut) { setSel(tt); setQty(1); } }}
                    disabled={tt.soldOut}
                    className="flex flex-col items-center justify-center py-5 px-3 border-2 transition-all font-black uppercase tracking-wider text-xs"
                    style={{
                      backgroundColor: tt.colorCode + '1a',
                      borderColor: sel?.id === tt.id ? tt.colorCode : tt.colorCode + '55',
                      color: tt.colorCode,
                      opacity: tt.soldOut ? 0.4 : 1,
                    }}
                  >
                    <span>{tt.name}</span>
                    {tt.soldOut && <span className="text-[9px] font-normal mt-1 text-[#FF2D20]">Hết vé</span>}
                  </button>
                ))}
              </div>
              {/* Legend */}
              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                {ticketTypes.map(tt => (
                  <div key={tt.id} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5" style={{ backgroundColor: tt.colorCode || '#CCFF00' }} />
                    <span className="text-[9px] md:text-[10px] font-mono text-gray-400">{tt.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ────── Sidebar — giữ nguyên style, chuyển sang ticketTypes thật ────── */}
        <div className="w-full lg:w-80 border-l border-[#222] bg-[#0a0a0a] flex flex-col">
          <div className="p-5 border-b border-[#222]">
            <div className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-gray-400 uppercase mb-1">{dateStr} - {timeStr}</div>
            <div style={D} className="text-xl font-black uppercase italic">{concert.name}</div>
            <div className="flex items-center gap-1 text-[11px] md:text-xs text-gray-400 mt-1"><MapPin size={10} />{concert.venue}</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
            <div className="text-[10px] md:text-xs font-mono tracking-[0.15em] text-gray-500 uppercase mb-2">Giá vé</div>
            {ticketTypes.map(tt => (
              <button key={tt.id} onClick={() => { if (!tt.soldOut) { setSel(tt); setQty(1); } }}
                disabled={tt.soldOut}
                className={`flex items-center justify-between px-3 py-2 transition-all border text-left ${sel?.id === tt.id
                  ? 'border-[#CCFF00]/50 bg-[#CCFF00]/5'
                  : tt.soldOut
                    ? 'border-transparent opacity-40'
                    : 'border-transparent hover:border-[#222]'
                  }`}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: tt.colorCode || '#CCFF00' }} />
                  <div>
                    <div className="text-xs md:text-sm font-bold">{tt.name}</div>
                    <div className="text-[9px] md:text-[10px] text-gray-500">
                      {tt.soldOut ? <span className="text-[#FF2D20]">Hết vé</span> : `Còn ${tt.available} vé · Max ${tt.maxPerUser}/người`}
                    </div>
                  </div>
                </div>
                <div className="text-xs md:text-sm font-black">{fmt(tt.price)}đ</div>
              </button>
            ))}
          </div>

          {/* Chọn số lượng + Tiếp tục */}
          {sel ? (
            <div className="p-5 border-t border-[#222]">
              <div className="text-xs md:text-sm font-black uppercase tracking-wide mb-1" style={{ color: sel.colorCode || '#CCFF00' }}>{sel.name}</div>
              <div className="text-[11px] md:text-xs text-gray-400 mb-4">Tối đa {sel.maxPerUser} vé/người · Còn {sel.available} vé</div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] md:text-xs text-gray-500 uppercase tracking-widest flex-1">Số lượng</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 border border-[#333] flex items-center justify-center hover:border-[#CCFF00]/40 transition-all">-</button>
                  <span className="w-6 text-center font-bold">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(maxQty, q + 1))} className="w-8 h-8 border border-[#333] flex items-center justify-center hover:border-[#CCFF00]/40 transition-all">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] md:text-xs text-gray-400">Tổng</span>
                <span style={D} className="text-2xl font-black text-[#CCFF00]">{fmt(sel.price * qty)}đ</span>
              </div>
              {errorMsg && bookingState === 'error' && (
                <div className="mb-4 p-3 border border-[#FF2D20]/40 bg-[#FF2D20]/5 flex items-start gap-2">
                  <AlertCircle size={14} className="text-[#FF2D20] shrink-0 mt-0.5" />
                  <span className="text-[11px] text-[#FF2D20]">{errorMsg}</span>
                </div>
              )}

              {/* CLOUDFLARE TURNSTILE CAPTCHA */}
              <div className="mb-4 flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setErrorMsg('Captcha bị lỗi, vui lòng thử lại')}
                  options={{ theme: 'dark' }}
                />
              </div>

              {/* Đặt vé và tạo Order */}
              <button
                onClick={handleBooking}
                disabled={!captchaToken || bookingState === 'submitting' || bookingState === 'polling'}
                className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] text-sm py-3 hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {bookingState === 'submitting' || bookingState === 'polling' ? (
                  <><Loader2 size={16} className="animate-spin" /> Đang xử lý...</>
                ) : (
                  <>Đặt vé →</>
                )}
              </button>
            </div>
          ) : (
            <div className="p-5 border-t border-[#222] text-center text-[11px] md:text-xs text-gray-500">Chọn một khu vực để tiếp tục</div>
          )}
        </div>
      </div>

      {/* Overlay lúc Polling */}
      {bookingState === 'polling' && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
          <ShieldCheck size={64} className="text-[#CCFF00] mb-6 animate-pulse" />
          <h2 style={D} className="text-3xl font-black uppercase italic mb-2">Đang giữ vé...</h2>
          <p className="text-gray-400 text-sm">Vui lòng không đóng trình duyệt.</p>
        </div>
      )}
    </div>
  );
}
