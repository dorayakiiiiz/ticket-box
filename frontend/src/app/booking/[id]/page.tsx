'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MapPin } from 'lucide-react';
import { concertService } from '@/services/concertService';
import { EventInfo, ZoneInfo } from '@/types';
import { fmt } from '@/utils/format';

export default function SeatMapPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [sel, setSel] = useState<ZoneInfo | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!id) return;
    const fetchEvent = async () => {
      const [data, zData] = await Promise.all([
        concertService.getEventById(id),
        concertService.getZones()
      ]);
      if (data) setEvent(data);
      if (zData) setZones(zData);
    };
    fetchEvent();
  }, [id]);

  if (!event || zones.length === 0) return <div className="min-h-screen pt-20 text-center text-gray-500">Đang tải...</div>;

  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  function ZoneBtn({ zoneId, label, rows = 1 }: { zoneId: string; label?: string; rows?: number }) {
    const z = zones.find(z => z.id === zoneId);
    if (!z) return null;
    const active = sel?.id === zoneId;
    return (
      <button onClick={() => { setSel(z); setQty(1); }}
        className="flex items-center justify-center text-[9px] md:text-xs font-black uppercase tracking-wider border-2 transition-all hover:brightness-110 py-3 px-1 md:py-4"
        style={{
          backgroundColor: z.color + "30", borderColor: active ? z.color : z.color + "60",
          color: z.color, gridRow: rows > 1 ? `span ${rows}` : undefined,
        }}>
        <span style={{ textAlign: "center", lineHeight: 1.2 }}>{(label ?? z.name).replace(" — ", "\n")}</span>
      </button>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-[#222] bg-[#0a0a0a] px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[11px] md:text-xs font-semibold text-gray-500 hover:text-white uppercase tracking-widest"><ChevronLeft size={14} /> Trở về</button>
        <div className="text-center">
          <div style={D} className="text-lg font-black uppercase italic">{event.name}</div>
          <div className="text-[10px] md:text-xs text-gray-500">{event.date} · {event.venue}</div>
        </div>
        <div className="w-20" />
      </div>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* Map */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 bg-[#0D0D0D]">
          <div className="text-center mb-5">
            <p className="text-[11px] md:text-xs font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Chọn khu vực — Bấm vào sơ đồ</p>
          </div>
          <div className="w-full max-w-xl lg:max-w-3xl flex flex-col gap-2 lg:gap-3">
            {/* Stage */}
            <div className="flex justify-center mb-1 lg:mb-3">
              <div className="bg-white/5 border border-white/10 px-24 py-2.5 lg:py-4 lg:px-32 text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] text-gray-500">STAGE</div>
            </div>
            {/* CAT row top */}
            <div className="grid grid-cols-2 gap-2 lg:gap-3">
              <ZoneBtn zoneId="cat2a" label="CAT 2A" />
              <ZoneBtn zoneId="cat2b" label="CAT 2B" />
            </div>
            {/* Middle block */}
            <div className="grid grid-cols-[60px_1fr_60px] lg:grid-cols-[80px_1fr_80px] gap-2 lg:gap-3">
              <div className="grid grid-rows-2 gap-2 lg:gap-3">
                <ZoneBtn zoneId="fz-2a" label="GA 2A" />
                <ZoneBtn zoneId="fz-1a" label="GA 1A" />
              </div>
              <div className="grid grid-cols-1 gap-2 lg:gap-3">
                <ZoneBtn zoneId="ozone" label="OZONE" />
              </div>
              <div className="grid grid-rows-2 gap-2 lg:gap-3">
                <ZoneBtn zoneId="fz-2b" label="GA 2B" />
                <ZoneBtn zoneId="fz-1b" label="GA 1B" />
              </div>
            </div>
            {/* VIP / SVIP / SKY */}
            <div className="grid grid-cols-5 gap-2 lg:gap-3">
              <ZoneBtn zoneId="vip-a" label="VIP A" />
              <ZoneBtn zoneId="svip-a" label="SVIP A" />
              <ZoneBtn zoneId="sky" label="SKY" />
              <ZoneBtn zoneId="svip-b" label="SVIP B" />
              <ZoneBtn zoneId="vip-b" label="VIP B" />
            </div>
            {/* CAT 1 */}
            <div className="grid grid-cols-[1fr_60px_1fr] lg:grid-cols-[1fr_80px_1fr] gap-2 lg:gap-3">
              <ZoneBtn zoneId="cat1a" label="CAT 1A" />
              <div className="flex items-center justify-center text-[8px] lg:text-xs font-mono tracking-widest text-gray-500 border border-[#222]">FOH</div>
              <ZoneBtn zoneId="cat1b" label="CAT 1B" />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {zones.slice(0, 7).map(z => (
              <div key={z.id} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5" style={{ backgroundColor: z.color }} />
                <span className="text-[9px] md:text-[10px] font-mono text-gray-400">{z.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 border-l border-[#222] bg-[#0a0a0a] flex flex-col">
          <div className="p-5 border-b border-[#222]">
            <div className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-gray-400 uppercase mb-1">{event.date} · {event.time}</div>
            <div style={D} className="text-xl font-black uppercase italic">{event.name}</div>
            <div className="flex items-center gap-1 text-[11px] md:text-xs text-gray-400 mt-1"><MapPin size={10} />{event.venue}</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
            <div className="text-[10px] md:text-xs font-mono tracking-[0.15em] text-gray-500 uppercase mb-2">Giá vé</div>
            {zones.map(z => (
              <button key={z.id} onClick={() => { setSel(z); setQty(1); }}
                className={`flex items-center justify-between px-3 py-2 transition-all border text-left ${sel?.id === z.id ? "border-[#CCFF00]/50 bg-[#CCFF00]/5" : "border-transparent hover:border-[#222]"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: z.color }} />
                  <div><div className="text-xs md:text-sm font-bold">{z.name}</div><div className="text-[9px] md:text-[10px] text-gray-500">{z.type} · {z.available} vé</div></div>
                </div>
                <div className="text-xs md:text-sm font-black">{fmt(z.price)}đ</div>
              </button>
            ))}
          </div>

          {sel ? (
            <div className="p-5 border-t border-[#222]">
              <div className="text-xs md:text-sm font-black uppercase tracking-wide mb-1" style={{ color: sel.color }}>{sel.name}</div>
              <div className="text-[11px] md:text-xs text-gray-400 mb-4">{sel.type} · Còn {sel.available} vé</div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] md:text-xs text-gray-500 uppercase tracking-widest flex-1">Số lượng</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 border border-[#333] flex items-center justify-center hover:border-[#CCFF00]/40 transition-all">-</button>
                  <span className="w-6 text-center font-bold">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(4, q + 1))} className="w-8 h-8 border border-[#333] flex items-center justify-center hover:border-[#CCFF00]/40 transition-all">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] md:text-xs text-gray-400">Tổng</span>
                <span style={D} className="text-2xl font-black text-[#CCFF00]">{fmt(sel.price * qty)}đ</span>
              </div>
              <button onClick={() => router.push(`/checkout/${event.id}?zone=${sel.id}&qty=${qty}`)}
                className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] text-sm py-3 hover:bg-white transition-colors">
                Tiếp tục →
              </button>
            </div>
          ) : (
            <div className="p-5 border-t border-[#222] text-center text-[11px] md:text-xs text-gray-500">Chọn một khu vực để tiếp tục</div>
          )}
        </div>
      </div>
    </div>
  );
}
