'use client';
import type { Concert } from '../../types';
import { formatConcertDate } from '../../services/concertService';

// Ticker banner chạy ngang — cần "use client" vì dùng CSS animation
// Nhận concerts qua prop từ Server Component (page.tsx) — không tự fetch
export default function TickerBanner({ concerts }: { concerts: Concert[] }) {
  if (concerts.length === 0) return null;

  return (
    <div className="bg-[#CCFF00] py-2 md:py-3 overflow-hidden">
      <div
        className="flex items-center gap-8 whitespace-nowrap"
        style={{ animation: 'ticker 32s linear infinite' }}
      >
        {[...Array(3)]
          .flatMap(() =>
            concerts
              .slice(0, 5)
              .flatMap((c) => [
                `🎤 ${c.name} · ${formatConcertDate(c.date)} · ${c.city}`,
                '★',
              ]),
          )
          .map((t, i) => (
            <span
              key={i}
              className="text-black text-[11px] font-black uppercase tracking-[0.1em] shrink-0"
            >
              {t}
            </span>
          ))}
      </div>
    </div>
  );
}
