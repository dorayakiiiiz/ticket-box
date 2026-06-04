import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Concert } from "../../types";
import { getMinPrice, getSoldPercent } from "../../services/concertService";
import { fmt } from "../../utils/format";

const D = { fontFamily: "'Barlow Condensed', sans-serif" };

export function SoldBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "#FF2D20" : pct >= 70 ? "#FF9500" : "#CCFF00";
  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-[9px] md:text-[10px] font-mono tracking-widest text-gray-400 uppercase">
          Đã bán
        </span>
        <span
          className="text-[9px] md:text-[10px] font-mono font-bold"
          style={{ color }}
        >
          {pct}%
        </span>
      </div>
      <div className="h-[2px] bg-white/10 w-full">
        <div
          className="h-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function SmallCard({ concert }: { concert: Concert }) {
  const price = getMinPrice(concert);
  const sold = getSoldPercent(concert);
  const dateStr = new Date(concert.date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/concert/${concert.id}`}
      className="group overflow-hidden bg-[#0a0a0a] border border-[#222] cursor-pointer hover:border-[#CCFF00]/40 transition-all duration-300 block"
    >
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: "16/10" }}
      >
        {concert.coverImageUrl ? (
          <img
            src={concert.coverImageUrl}
            alt={concert.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-[#111] flex items-center justify-center text-gray-600 text-sm">
            No Image
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        {sold >= 90 && (
          <div className="absolute top-2 left-2">
            <span className="inline-block text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 bg-[#FF2D20] text-white">
              GẦN HẾT VÉ
            </span>
          </div>
        )}
        <div className="absolute bottom-2 left-3 text-[9px] md:text-[10px] font-mono tracking-[0.15em] text-[#CCFF00] uppercase">
          {dateStr}
        </div>
      </div>
      <div className="p-3">
        <h3
          style={D}
          className="text-sm md:text-base font-bold uppercase tracking-wide text-white line-clamp-1"
        >
          {concert.name}
        </h3>
        <p className="text-[11px] md:text-xs text-gray-400 mt-0.5 line-clamp-1">
          {concert.venue}, {concert.city}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs md:text-sm font-semibold text-white">
            {fmt(price)}đ
          </span>
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#CCFF00] hover:text-black hover:bg-[#CCFF00] px-2 py-0.5 transition-all border border-[#CCFF00]/30 hover:border-[#CCFF00]">
            Mua vé
          </span>
        </div>
        <SoldBar pct={sold} />
      </div>
    </Link>
  );
}

export function FeaturedCard({ concert }: { concert: Concert }) {
  const price = getMinPrice(concert);
  const sold = getSoldPercent(concert);

  return (
    <Link
      href={`/concert/${concert.id}`}
      className="group relative overflow-hidden border border-[#222] cursor-pointer hover:border-[#CCFF00]/40 transition-all duration-300 h-full min-h-[480px] block"
    >
      {concert.coverImageUrl ? (
        <img
          src={concert.coverImageUrl}
          alt={concert.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-[#111]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute top-4 right-0 bg-[#CCFF00]">
        <div
          style={{
            ...D,
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}
          className="px-1 py-2 text-black text-[9px] md:text-[10px] font-black tracking-[0.2em] uppercase"
        >
          FEATURED
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-[#CCFF00] uppercase mb-2">
          {new Date(concert.date).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
        <h2
          style={D}
          className="text-3xl md:text-4xl font-black uppercase italic tracking-tight leading-none text-white mb-1"
        >
          {concert.name}
        </h2>
        <p className="text-xs md:text-sm text-white/60 mb-3">{concert.subtitle}</p>
        <div className="flex items-center gap-2 text-[11px] md:text-xs text-white/50 mb-4">
          <MapPin size={10} />
          <span>
            {concert.venue}, {concert.city}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest mb-0.5">
              Từ
            </div>
            <div className="text-xl md:text-2xl font-black text-white">{fmt(price)}đ</div>
          </div>
          <span className="bg-[#CCFF00] text-black text-xs md:text-sm font-black uppercase tracking-widest px-4 py-2 hover:bg-white transition-colors">
            Mua vé →
          </span>
        </div>
        <SoldBar pct={sold} />
      </div>
    </Link>
  );
}

export function TrendingCard({
  concert,
  rank,
}: {
  concert: Concert;
  rank: number;
}) {
  const price = getMinPrice(concert);
  const sold = getSoldPercent(concert);

  return (
    <Link
      href={`/concert/${concert.id}`}
      className="group relative overflow-hidden border border-[#222] cursor-pointer hover:border-[#CCFF00]/40 transition-all duration-300 shrink-0 w-52 block"
    >
      <div style={{ aspectRatio: "3/4" }} className="relative overflow-hidden">
        {concert.coverImageUrl ? (
          <img
            src={concert.coverImageUrl}
            alt={concert.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-[#111]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
        <div className="absolute top-3 left-3">
          <span
            style={D}
            className="text-5xl font-black italic text-white/20 leading-none select-none"
          >
            {String(rank).padStart(2, "0")}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="text-[9px] md:text-[10px] font-mono tracking-[0.15em] text-[#CCFF00] uppercase mb-1">
            {new Date(concert.date).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "short",
            })}
          </div>
          <h3
            style={D}
            className="text-sm md:text-base font-black uppercase italic text-white leading-tight mb-0.5"
          >
            {concert.name}
          </h3>
          <p className="text-[10px] md:text-xs text-white/50">{concert.city}</p>
          <div className="mt-1">
            <span className="text-xs md:text-sm font-bold text-white">{fmt(price)}đ</span>
          </div>
          <SoldBar pct={sold} />
        </div>
      </div>
    </Link>
  );
}
