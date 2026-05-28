'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Download } from 'lucide-react';
import { concertService } from '../../../services/concertService';
import { EventInfo, ZoneInfo } from '../../../types';
import { fmt } from '../../../utils/format';

export default function ETicketPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const zoneId = searchParams.get('zone');
  const qty = Number(searchParams.get('qty') || 1);
  const holderName = searchParams.get('holderName') || 'Nguyễn Văn A';

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [zone, setZone] = useState<ZoneInfo | null>(null);
  const [ticketNo] = useState("VT-" + Math.random().toString(36).substring(2, 8).toUpperCase());

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

  if (!event || !zone) return <div className="min-h-screen pt-20 text-center text-gray-500">Đang tạo vé...</div>;

  const total = zone.price * qty;
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-[#050505]">
      <div className="flex items-center gap-2 mb-8">
        <CheckCircle size={16} className="text-[#CCFF00]" />
        <span className="text-[#CCFF00] font-bold text-sm uppercase tracking-[0.12em]">Thanh toán thành công — E-ticket đã gửi qua email</span>
      </div>

      {/* TICKET */}
      <div className="w-full max-w-[640px]">
        <div className="relative overflow-hidden border border-white/10 bg-[#111]">
          {/* Top accent stripe */}
          <div className="h-1.5 w-full" style={{ backgroundColor: zone.color }} />

          {/* Top section */}
          <div className="p-7 pb-5">
            <div className="flex items-start justify-between gap-4 mb-7">
              <div>
                <div style={D} className="text-[10px] font-mono tracking-[0.25em] text-gray-500 uppercase mb-1">TicketZ — E-TICKET</div>
                <h1 style={{ ...D, fontSize: "clamp(28px,4.5vw,52px)" }}
                  className="font-black uppercase italic leading-none text-white">{event.name}</h1>
                <p className="text-sm font-semibold tracking-[0.06em] mt-1.5" style={{ color: zone.color }}>{event.subtitle}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[9px] font-mono text-gray-500 mb-1">VÉ SỐ</div>
                <div className="font-mono font-bold text-sm" style={{ color: zone.color }}>{ticketNo}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Ngày diễn", value: event.date },
                { label: "Giờ vào cổng", value: event.time },
                { label: "Địa điểm", value: event.venue },
                { label: "Thành phố", value: event.city },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-gray-500 mb-1">{label}</div>
                  <div className="text-sm font-bold text-white">{value}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-gray-500 mb-1">Nghệ sĩ</div>
              <div className="text-xs text-white/60">{event.artistList.map(a => a.name).join(" · ")}</div>
            </div>
          </div>

          {/* Perforation */}
          <div className="flex items-center">
            <div className="w-5 h-5 -ml-2.5" style={{ borderRadius: "50%", backgroundColor: "#050505", borderRight: "1px solid rgba(255,255,255,0.08)" }} />
            <div className="flex-1 border-t border-dashed border-white/12" />
            <div className="w-5 h-5 -mr-2.5" style={{ borderRadius: "50%", backgroundColor: "#050505", borderLeft: "1px solid rgba(255,255,255,0.08)" }} />
          </div>

          {/* Bottom section */}
          <div className="p-7 pt-5 flex flex-col sm:flex-row items-center gap-8">
            {/* Zone + holder */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 shrink-0" style={{ backgroundColor: zone.color }} />
                <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-gray-500">Khu vực</div>
              </div>
              <div style={{ ...D, color: zone.color }} className="text-5xl font-black uppercase italic leading-none mb-3">{zone.name}</div>
              <div className="text-[11px] text-gray-500 mb-5">{zone.type} · {qty} vé</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-gray-500 mb-1">Khán giả</div>
                  <div className="text-sm font-bold text-white">{holderName}</div>
                </div>
                <div>
                  <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-gray-500 mb-1">Giá trị</div>
                  <div style={D} className="text-xl font-black text-white">{fmt(total)}đ</div>
                </div>
              </div>
            </div>

            {/* QR */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="bg-white p-3">
                <svg viewBox="0 0 100 100" className="w-28 h-28">
                  <rect width="100" height="100" fill="white" />
                  {/* Simulated data cells */}
                  {Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => {
                    const skip = (r < 4 && c < 4) || (r < 4 && c > 5) || (r > 5 && c < 4);
                    if (skip) return null;
                    const on = (r * 11 + c * 7 + r * c * 3) % 3 !== 0;
                    return on ? <rect key={`${r}${c}`} x={c * 12 + 2} y={r * 12 + 2} width={10} height={10} fill="black" /> : null;
                  }))}
                  {/* Corner markers */}
                  {([[2, 2], [58, 2], [2, 58]] as [number, number][]).map(([x, y], i) => (
                    <g key={i}>
                      <rect x={x} y={y} width={32} height={32} fill="black" />
                      <rect x={x + 4} y={y + 4} width={24} height={24} fill="white" />
                      <rect x={x + 9} y={y + 9} width={14} height={14} fill="black" />
                    </g>
                  ))}
                </svg>
              </div>
              <div className="font-mono text-[9px] text-gray-500 tracking-[0.12em]">{ticketNo}</div>
              <div className="text-[9px] text-gray-500">Quét tại cổng vào</div>
            </div>
          </div>

          <div className="h-px w-full" style={{ backgroundColor: zone.color + "30" }} />
        </div>

        <div className="text-center mt-3 text-[9px] font-mono text-gray-500 tracking-[0.15em]">
          VÉ ĐIỆN TỬ · KHÔNG CẦN IN · CHỈ SỬ DỤNG MỘT LẦN · TICKETZ.VN
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <button className="flex items-center gap-2 bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] text-xs px-6 py-3 hover:bg-white transition-colors">
          <Download size={13} /> Tải về PDF
        </button>
        <button onClick={() => router.push('/')} className="border border-[#333] text-gray-400 font-semibold text-xs uppercase tracking-widest px-6 py-3 hover:border-white/30 hover:text-white transition-colors bg-transparent">
          Về trang chủ
        </button>
      </div>
    </div>
  );
}
