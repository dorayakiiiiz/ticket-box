import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { EventInfo } from '../../types';

const D = { fontFamily: "'Barlow Condensed', sans-serif" };

export function SoldBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "#FF2D20" : pct >= 70 ? "#FF9500" : "#CCFF00";
  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-[9px] font-mono tracking-widest text-gray-400 uppercase">Đã bán</span>
        <span className="text-[9px] font-mono font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-[2px] bg-white/10 w-full">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function Tag({ tag, tagStyle }: { tag: string; tagStyle: string }) {
  return <span className={`inline-block text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 ${tagStyle}`}>{tag}</span>;
}

export function SmallCard({ event }: { event: EventInfo }) {
  return (
    <Link href={`/concert/${event.id}`} className="group overflow-hidden bg-[#0a0a0a] border border-[#222] cursor-pointer hover:border-[#CCFF00]/40 transition-all duration-300 block">
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
        <img src={event.image} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        {event.tag && <div className="absolute top-2 left-2"><Tag tag={event.tag} tagStyle={event.tagStyle} /></div>}
        <div className="absolute bottom-2 left-3 text-[9px] font-mono tracking-[0.15em] text-[#CCFF00] uppercase">{event.date} · {event.time}</div>
      </div>
      <div className="p-3">
        <h3 style={D} className="text-sm font-bold uppercase tracking-wide text-white line-clamp-1">{event.name}</h3>
        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{event.venue}, {event.city}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-semibold text-white">{event.price}đ</span>
          <button className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00] hover:text-black hover:bg-[#CCFF00] px-2 py-0.5 transition-all border border-[#CCFF00]/30 hover:border-[#CCFF00]">Mua vé</button>
        </div>
        <SoldBar pct={event.sold} />
      </div>
    </Link>
  );
}

export function FeaturedCard({ event }: { event: EventInfo }) {
  return (
    <Link href={`/concert/${event.id}`} className="group relative overflow-hidden border border-[#222] cursor-pointer hover:border-[#CCFF00]/40 transition-all duration-300 h-full min-h-[480px] block">
      <img src={event.image} alt={event.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute top-4 right-0 bg-[#CCFF00]">
        <div style={{ ...D, writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          className="px-1 py-2 text-black text-[9px] font-black tracking-[0.2em] uppercase">FEATURED</div>
      </div>
      {event.tag && <div className="absolute top-4 left-4"><Tag tag={event.tag} tagStyle={event.tagStyle} /></div>}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase mb-2">{event.date} · {event.time}</div>
        <h2 style={D} className="text-3xl font-black uppercase italic tracking-tight leading-none text-white mb-1">{event.name}</h2>
        <p className="text-xs text-white/60 mb-3">{event.artist}</p>
        <div className="flex items-center gap-2 text-[11px] text-white/50 mb-4"><MapPin size={10} /><span>{event.venue}, {event.city}</span></div>
        <div className="flex items-center justify-between">
          <div><div className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Từ</div><div className="text-xl font-black text-white">{event.price}đ</div></div>
          <button className="bg-[#CCFF00] text-black text-xs font-black uppercase tracking-widest px-4 py-2 hover:bg-white transition-colors">Mua vé →</button>
        </div>
        <SoldBar pct={event.sold} />
      </div>
    </Link>
  );
}

export function TrendingCard({ event, rank }: { event: EventInfo; rank: number }) {
  return (
    <Link href={`/concert/${event.id}`} className="group relative overflow-hidden border border-[#222] cursor-pointer hover:border-[#CCFF00]/40 transition-all duration-300 shrink-0 w-52 block">
      <div style={{ aspectRatio: "3/4" }} className="relative overflow-hidden">
        <img src={event.image} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
        <div className="absolute top-3 left-3">
          <span style={D} className="text-5xl font-black italic text-white/20 leading-none select-none">{String(rank).padStart(2, "0")}</span>
        </div>
        {event.tag && <div className="absolute top-3 right-3"><Tag tag={event.tag} tagStyle={event.tagStyle} /></div>}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="text-[9px] font-mono tracking-[0.15em] text-[#CCFF00] uppercase mb-1">{event.date}</div>
          <h3 style={D} className="text-sm font-black uppercase italic text-white leading-tight mb-0.5">{event.name}</h3>
          <p className="text-[10px] text-white/50">{event.city}</p>
          <div className="mt-1"><span className="text-xs font-bold text-white">{event.price}đ</span></div>
          <SoldBar pct={event.sold} />
        </div>
      </div>
    </Link>
  );
}
