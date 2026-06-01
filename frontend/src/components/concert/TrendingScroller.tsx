'use client';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TrendingCard } from './EventCards';
import type { Concert } from '../../types';

// TrendingScroller — cần "use client" vì dùng useRef để scroll ngang
// Nhận concerts qua prop từ Server Component (page.tsx) — không tự fetch
export default function TrendingScroller({ concerts }: { concerts: Concert[] }) {
  const trendRef = useRef<HTMLDivElement>(null);
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  return (
    <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-px bg-[#FF2D20]" />
            <span className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-[#FF2D20] uppercase">
              Đang Hot
            </span>
          </div>
          <h2
            style={D}
            className="text-4xl font-black uppercase italic tracking-tight"
          >
            TRENDING TUẦN NÀY
          </h2>
        </div>
        {/* Scroll buttons — cần useRef, phải là Client Component */}
        <div className="flex gap-2">
          <button
            onClick={() =>
              trendRef.current?.scrollBy({ left: -260, behavior: 'smooth' })
            }
            className="border border-[#333] p-2 hover:border-[#CCFF00]/40 hover:text-[#CCFF00] transition-all"
            aria-label="Cuộn trái"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() =>
              trendRef.current?.scrollBy({ left: 260, behavior: 'smooth' })
            }
            className="border border-[#333] p-2 hover:border-[#CCFF00]/40 hover:text-[#CCFF00] transition-all"
            aria-label="Cuộn phải"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div
        ref={trendRef}
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {concerts.map((c, i) => (
          <TrendingCard key={c.id} concert={c} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}
