'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Clock, ChevronLeft, AlertCircle, X, Loader2, AlertTriangle } from 'lucide-react';
import { concertService } from '@/services/concertService';
import { paymentService } from '@/services/paymentService';
import { useAuthStore } from '@/stores/authStore';
import type { Concert, TicketType } from '@/types';
import { fmt } from '@/utils/format';

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const concertId = params.id as string;
  const ticketTypeId = searchParams.get('ticketTypeId');
  const qty = Number(searchParams.get('qty') || 1);
  const orderId = searchParams.get('orderId');

  const { user } = useAuthStore();

  const [concert, setConcert] = useState<Concert | null>(null);
  const [ticketType, setTicketType] = useState<TicketType | null>(null);
  const [secs, setSecs] = useState(15 * 60);
  const [pay, setPay] = useState<"momo" | "vnpay" | "card">("vnpay");
  const [name, setName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [agreed, setAgreed] = useState(false);

  const [paymentState, setPaymentState] = useState<'idle' | 'processing'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!concertId || !ticketTypeId) return;
    const fetchEvent = async () => {
      try {
        const data = await concertService.getById(concertId);
        if (data) {
          if (data.openTime && new Date() < new Date(data.openTime)) {
            router.push(`/concert/${concertId}`);
            return;
          }
          setConcert(data);
          const tt = data.ticketTypes.find(t => t.id === ticketTypeId);
          if (tt) setTicketType(tt);
        }
      } catch (e) {
        // Handle error
      }
    };
    fetchEvent();
  }, [concertId, ticketTypeId]);

  useEffect(() => {
    const timerId = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (user) {
      if (!name) setName(user.fullName || "");
      if (!email) setEmail(user.email || "");
      if (!phone) setPhone(user.phone || "");
    }
  }, [user]);

  if (!concert || !ticketType) return <div className="min-h-screen pt-20 text-center text-gray-500">Đang tải...</div>;

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const total = ticketType.price * qty;
  const fee = Math.round(total * 0.02);
  const urgent = secs < 60;
  const expired = secs === 0;
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };
  const dateStr = new Date(concert.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = new Date(concert.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // Handle Payment — Gọi API tạo URL thanh toán và redirect sang cổng
  const handlePayment = async () => {
    if (!name || !email || !agreed || !orderId) return;
    setError(null);
    setPaymentState('processing');

    try {
      // Map payment method FE → Backend enum
      const methodMap: Record<string, 'VNPAY' | 'MOMO'> = {
        vnpay: 'VNPAY',
        momo: 'MOMO',
      };
      const paymentMethod = methodMap[pay];

      if (!paymentMethod) {
        setError('Phương thức thanh toán này chưa được hỗ trợ. Vui lòng chọn VNPay hoặc MoMo.');
        setPaymentState('idle');
        return;
      }

      const result = await paymentService.createPaymentUrl(orderId, paymentMethod, name, email, phone);
      // Redirect trình duyệt sang cổng thanh toán (VNPay/MoMo sandbox)
      window.location.href = result.paymentUrl;
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        'Không thể tạo liên kết thanh toán. Vui lòng thử lại.';
      setError(message);
      setPaymentState('idle');
    }
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-[#222] bg-[#0a0a0a] px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[11px] md:text-xs font-semibold text-gray-500 hover:text-white uppercase tracking-widest"><ChevronLeft size={14} /> Quay lại</button>
        <div style={D} className="text-lg font-black uppercase italic">Thanh toán</div>
        <div className="flex items-center gap-2">
          <Clock size={12} className={urgent ? "text-[#FF2D20]" : "text-[#CCFF00]"} />
          <span className={`font-mono font-bold text-sm md:text-base ${urgent ? "text-[#FF2D20]" : "text-[#CCFF00]"}`}>{mm}:{ss}</span>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-10">
        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-[#FF2D20]/10 border border-[#FF2D20]/30 px-4 py-3 text-sm">
            <AlertTriangle size={16} className="text-[#FF2D20] shrink-0" />
            <span className="text-[#FF2D20]">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-[#FF2D20]/60 hover:text-[#FF2D20]">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Expired timer banner */}
        {expired && (
          <div className="mb-6 flex items-center gap-3 bg-[#FF2D20]/10 border border-[#FF2D20]/30 px-4 py-3 text-sm">
            <AlertTriangle size={16} className="text-[#FF2D20] shrink-0" />
            <span className="text-[#FF2D20]">Thời gian giữ vé đã hết. Vui lòng quay lại và đặt vé mới.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
          <div>
            <h2 style={D} className="text-2xl font-black uppercase italic mb-6">Thông tin khán giả</h2>
            <div className="flex flex-col gap-4 mb-8">
              {[
                { label: "Họ và tên *", val: name, set: setName, ph: "Nguyễn Văn A", type: "text" },
                { label: "Email *", val: email, set: setEmail, ph: "email@example.com", type: "email" },
                { label: "Số điện thoại", val: phone, set: setPhone, ph: "0901 234 567", type: "tel" },
              ].map(({ label, val, set, ph, type }) => (
                <div key={label}>
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] text-gray-500 block mb-1.5">{label}</label>
                  <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    className="w-full bg-[#111] border border-[#333] text-white text-sm md:text-base px-4 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-gray-600" />
                </div>
              ))}
            </div>

            <h2 style={D} className="text-2xl font-black uppercase italic mb-4">Phương thức thanh toán</h2>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { id: "momo" as const, label: "MoMo", sub: "Ví điện tử MoMo", img: "https://developers.momo.vn/v3/assets/images/MOMO-Logo-App-6262c3743a290ef02396a24ea2b66c35.png" },
                { id: "vnpay" as const, label: "VNPAY", sub: "QR Code & Thẻ ngân hàng", img: "https://cdn.haitrieu.com/wp-content/uploads/2022/10/Icon-VNPAY-QR.png" },
                { id: "card" as const, label: "Thẻ quốc tế", sub: "Visa, Mastercard, JCB", img: "https://images.icon-icons.com/2341/PNG/512/mastercard_payment_method_card_icon_142734.png" },
              ].map(p => (
                <button key={p.id} onClick={() => setPay(p.id)}
                  className={`flex items-center gap-4 p-4 border-2 transition-all text-left bg-transparent ${pay === p.id ? "border-[#CCFF00]" : "border-[#333] hover:border-[#333]/80"}`}>
                  <div className="w-4 h-4 border-2 flex items-center justify-center shrink-0" style={{ borderColor: pay === p.id ? "#CCFF00" : "rgba(255,255,255,0.15)" }}>
                    {pay === p.id && <div className="w-2 h-2 bg-[#CCFF00]" />}
                  </div>
                  <div className="w-8 flex items-center justify-center shrink-0">
                    <img className="w-8 h-full object-contain" src={p.img} alt={p.label} />
                  </div>
                  <div><div className="text-sm md:text-base font-bold text-white">{p.label}</div><div className="text-[11px] md:text-xs text-gray-500">{p.sub}</div></div>
                </button>
              ))}
            </div>

            <button onClick={() => setAgreed(a => !a)} className="flex items-start gap-3 text-left mb-8 bg-transparent border-0 outline-none">
              <div className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${agreed ? "border-[#CCFF00] bg-[#CCFF00]" : "border-[#333]"}`}>
                {agreed && <X size={10} className="text-black" />}
              </div>
              <span className="text-[11px] md:text-xs text-gray-400 leading-relaxed">Tôi đã đọc và đồng ý với <span className="text-[#CCFF00]">Điều khoản sử dụng</span> và <span className="text-[#CCFF00]">Chính sách hoàn tiền</span> của TicketZ.</span>
            </button>

            <button onClick={handlePayment}
              disabled={!name || !email || !agreed || paymentState === 'processing' || expired}
              className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] py-4 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {paymentState === 'processing' ? (
                <><Loader2 size={16} className="animate-spin" /> Đang chuyển hướng...</>
              ) : (
                <>Xác nhận & Thanh toán {fmt(total + fee)}đ →</>
              )}
            </button>
          </div>

          {/* Order summary */}
          <div>
            <div className="sticky top-20">
              <div className="bg-[#0a0a0a] border border-[#222] p-5 mb-3">
                <div className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-gray-500 uppercase mb-3">Thông tin đặt vé</div>
                <div style={D} className="text-xl font-black uppercase italic mb-1">{concert.name}</div>
                <div className="text-[11px] md:text-xs font-light text-gray-400 mb-4">{dateStr} - {timeStr} - {concert.venue}</div>
                <div className="border-t border-[#333] pt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm md:text-base font-bold">{ticketType.name}</div><div className="text-[10px] md:text-xs text-gray-500">x{qty}</div></div>
                    <div className="text-sm md:text-base font-bold">{fmt(total)}đ</div>
                  </div>
                  <div className="flex justify-between text-[11px] md:text-xs text-gray-400">
                    <span>Phí dịch vụ (2%)</span><span>+{fmt(fee)}đ</span>
                  </div>
                  <div className="border-t border-[#333] pt-3 flex justify-between items-center">
                    <span className="text-[11px] md:text-xs font-bold uppercase tracking-widest">Tổng cộng</span>
                    <span style={D} className="text-2xl font-black text-[#CCFF00]">{fmt(total + fee)}đ</span>
                  </div>
                </div>
              </div>
              <div className={`bg-[#0a0a0a] border p-4 flex items-center gap-4 ${urgent ? "border-[#FF2D20]/40" : "border-[#222]"}`}>
                <AlertCircle size={14} className={urgent ? "text-[#FF2D20] shrink-0" : "text-[#CCFF00] shrink-0"} />
                <div>
                  <div className="text-[11px] md:text-xs font-bold">Vé được giữ trong</div>
                  <div className={`font-mono text-xl font-black ${urgent ? "text-[#FF2D20]" : "text-[#CCFF00]"}`}>{mm}:{ss}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

