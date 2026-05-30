'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Clock, ChevronLeft, AlertCircle, X } from 'lucide-react';
import { concertService } from '@/services/concertService';
import { EventInfo, ZoneInfo } from '@/types';
import { fmt } from '@/utils/format';

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const zoneId = searchParams.get('zone');
  const qty = Number(searchParams.get('qty') || 1);

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [zone, setZone] = useState<ZoneInfo | null>(null);
  const [secs, setSecs] = useState(15 * 60);
  const [pay, setPay] = useState<"momo" | "vnpay" | "card">("momo");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!id || !zoneId) return;
    const fetchEvent = async () => {
      const [data, zData] = await Promise.all([
        concertService.getEventById(id),
        concertService.getZones()
      ]);
      if (data) setEvent(data);
      if (zData) setZone(zData.find(z => z.id === zoneId) || null);
    };
    fetchEvent();
  }, [id, zoneId]);

  useEffect(() => {
    const timerId = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timerId);
  }, []);

  if (!event || !zone) return <div className="min-h-screen pt-20 text-center text-gray-500">Đang tải...</div>;

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const total = zone.price * qty;
  const fee = Math.round(total * 0.02);
  const urgent = secs < 60;
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

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
                { id: "momo" as const, label: "MoMo", sub: "Ví điện tử MoMo", dot: "#D82D8B" },
                { id: "vnpay" as const, label: "VNPAY", sub: "QR Code & Thẻ ngân hàng", dot: "#E31837" },
                { id: "card" as const, label: "Thẻ quốc tế", sub: "Visa, Mastercard, JCB", dot: "#1A56DB" },
              ].map(p => (
                <button key={p.id} onClick={() => setPay(p.id)}
                  className={`flex items-center gap-4 p-4 border-2 transition-all text-left bg-transparent ${pay === p.id ? "border-[#CCFF00]" : "border-[#333] hover:border-[#333]/80"}`}>
                  <div className="w-4 h-4 border-2 flex items-center justify-center shrink-0" style={{ borderColor: pay === p.id ? "#CCFF00" : "rgba(255,255,255,0.15)" }}>
                    {pay === p.id && <div className="w-2 h-2 bg-[#CCFF00]" />}
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ backgroundColor: p.dot + "20" }}>
                    <div className="w-3 h-3" style={{ backgroundColor: p.dot }} />
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

            <button onClick={() => { if (name && email && agreed) router.push(`/ticket/${event.id}?zone=${zone.id}&qty=${qty}&holderName=${encodeURIComponent(name)}`); }}
              disabled={!name || !email || !agreed}
              className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] py-4 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              Xác nhận & Thanh toán {fmt(total + fee)}đ →
            </button>
          </div>

          {/* Order summary */}
          <div>
            <div className="sticky top-20">
              <div className="bg-[#0a0a0a] border border-[#222] p-5 mb-3">
                <div className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-gray-500 uppercase mb-3">Thông tin đặt vé</div>
                <div style={D} className="text-xl font-black uppercase italic mb-1">{event.name}</div>
                <div className="text-[11px] md:text-xs text-gray-400 mb-4">{event.date} · {event.time} · {event.venue}</div>
                <div className="border-t border-[#333] pt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm md:text-base font-bold">{zone.name}</div><div className="text-[10px] md:text-xs text-gray-500">{zone.type} · x{qty}</div></div>
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
