// Server Component — không có "use client"
// Dùng ISR: fetch danh sách concert từ backend, revalidate mỗi 60 giây
// Next.js build trang thành HTML tĩnh và cache lại ở server.
// Mọi user đều nhận từ cache, không gọi DB mỗi request.
// Sau 60 giây, Next.js tự rebuild lại trong nền nếu có dữ liệu mới.
import Link from "next/link";
import { ArrowRight, Ticket, Play } from "lucide-react";
import HeroCarousel from "../components/concert/HeroCarousel";
import { SmallCard, FeaturedCard } from "../components/concert/EventCards";
import TickerBanner from "../components/concert/TickerBanner";
import TrendingScroller from "../components/concert/TrendingScroller";
import { getMinPrice, formatConcertDate } from "../services/concertService";
import { fmt } from "../utils/format";
import type { Concert } from "../types";

// URL backend — dùng env var để hỗ trợ production deploy
// Server Component chạy phía Node.js nên có thể dùng non-public var
const API = process.env.NEXT_PUBLIC_API_URL;

// Fetch concerts với ISR revalidate 60s
// Lỗi fetch thì trả về mảng rỗng, trang vẫn render bình thường
async function getConcerts(): Promise<Concert[]> {
  // DEBUG: xóa console.log này sau khi fix xong
  console.log('[DEBUG] NEXT_PUBLIC_API_URL =', process.env.NEXT_PUBLIC_API_URL);
  console.log('[DEBUG] API base =', API);
  console.log('[DEBUG] Fetching:', `${API}/concerts`);
  try {
    const res = await fetch(`${API}/concerts`, {
      next: { revalidate: 60 },
    });
    console.log('[DEBUG] Response status:', res.status, res.statusText);
    if (!res.ok) {
      console.log('[DEBUG] Response not ok, returning []');
      return [];
    }
    const data = await res.json();
    console.log('[DEBUG] Concerts count:', data.length);
    return data;
  } catch (err) {
    console.error('[DEBUG] Fetch error:', err);
    return [];
  }
}

export default async function HomePage() {
  // Data được fetch server-side, cache theo ISR
  const concerts = await getConcerts();

  const featured = concerts[0];
  const grid = concerts.slice(1, 5);
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  return (
    <>
      <div className="-mt-14">
        {/* HeroCarousel nhận concerts qua prop — không tự fetch */}
        <HeroCarousel concerts={concerts} />
      </div>

      {/* Ticker — Client Component, nhận concerts qua prop */}
      <TickerBanner concerts={concerts} />

      {/* Events section */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-16 pb-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-px bg-[#CCFF00]" />
              <span className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-[#CCFF00] uppercase">
                Nổi Bật
              </span>
            </div>
            <h2
              style={D}
              className="text-4xl font-black uppercase italic tracking-tight"
            >
              SỰ KIỆN HOT
            </h2>
          </div>
          <button className="hidden md:flex items-center gap-1 text-[11px] md:text-xs font-semibold text-gray-400 hover:text-[#CCFF00] uppercase tracking-widest transition-colors">
            Xem tất cả <ArrowRight size={12} />
          </button>
        </div>

        {concerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {featured && (
              <div className="lg:col-span-1 lg:row-span-2">
                {/* EventCards không có "use client", render được hoàn toàn ở server */}
                <FeaturedCard concert={featured} />
              </div>
            )}
            {grid.map((c) => (
              <SmallCard key={c.id} concert={c} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-gray-500 text-sm md:text-base">
            Đang tải sự kiện...
          </div>
        )}
      </section>

      {/* Trending — Client Component vì cần useRef cho scroll */}
      <TrendingScroller concerts={concerts} />

      {/* Upcoming list — render server-side hoàn toàn */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-8 border-t border-[#222]">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-px bg-[#CCFF00]" />
            <span className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-[#CCFF00] uppercase">
              Lịch Diễn
            </span>
          </div>
          <h2
            style={D}
            className="text-4xl font-black uppercase italic tracking-tight"
          >
            SẮP DIỄN RA
          </h2>
        </div>
        {concerts
          .filter((c) => c.status === "UPCOMING")
          .map((c, i) => (
            <Link
              href={`/concert/${c.id}`}
              key={c.id}
              className="group flex items-center gap-4 md:gap-8 py-4 border-b border-[#222] hover:bg-[#111] transition-colors cursor-pointer px-3 -mx-3 block sm:flex"
            >
              <span
                style={D}
                className="text-2xl font-black italic text-white/10 w-8 shrink-0 text-right"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="w-14 shrink-0 text-center">
                <div className="text-[10px] font-mono tracking-widest text-[#CCFF00]">
                  {formatConcertDate(c.date)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  style={D}
                  className="font-black uppercase text-sm md:text-base tracking-wide truncate group-hover:text-[#CCFF00] transition-colors"
                >
                  {c.name}
                </h3>
                <div className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                  {c.venue}, {c.city}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm md:text-base font-bold">{fmt(getMinPrice(c))}đ</div>
                <div className="text-[10px] md:text-xs text-gray-500">Từ</div>
              </div>
              <div className="hidden md:block shrink-0 border border-[#CCFF00]/30 text-[#CCFF00] text-[10px] md:text-xs font-black uppercase tracking-widest px-4 py-1.5 group-hover:bg-[#CCFF00] group-hover:text-black transition-all">
                Mua →
              </div>
            </Link>
          ))}
      </section>

      {/* Promo — static, render server-side */}
      <section className="relative overflow-hidden mt-12">
        <img
          src="https://images.unsplash.com/photo-1563841930606-67e2bce48b78?w=1800&h=600&fit=crop&auto=format"
          alt="Concert crowd"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/80" />
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ticket size={12} className="text-[#CCFF00]" />
              <span className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-[#CCFF00] uppercase">
                Đừng Bỏ Lỡ
              </span>
            </div>
            <h2
              style={D}
              className="text-5xl md:text-7xl font-black uppercase italic text-white leading-none tracking-tight"
            >
              VÉ
              <br />
              <span className="text-[#CCFF00]">CHÍNH HÃNG</span>
              <br />
              GIÁ TỐT NHẤT
            </h2>
            <p className="text-white/50 text-sm md:text-base mt-4 max-w-sm leading-relaxed">
              Mua vé trực tiếp từ ban tổ chức — không qua trung gian, không vé
              giả, hoàn tiền khi hủy sự kiện.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <button className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.15em] text-sm md:text-base px-10 py-4 hover:bg-white transition-colors flex items-center gap-2">
              Khám phá sự kiện <ArrowRight size={14} />
            </button>
            <button className="border border-white/30 text-white font-semibold uppercase tracking-[0.12em] text-xs md:text-sm px-10 py-4 hover:border-white transition-colors flex items-center gap-2 justify-center">
              <Play size={12} /> Xem trailer
            </button>
          </div>
        </div>
      </section>

      {/* Category grid — static, render server-side */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-px bg-[#CCFF00]" />
          <span className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-[#CCFF00] uppercase">
            Thể Loại
          </span>
        </div>
        <h2
          style={D}
          className="text-4xl font-black uppercase italic tracking-tight mb-8"
        >
          TÌM THEO THỂ LOẠI
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[
            { n: "Nhạc Pop", c: 48, i: "🎤" },
            { n: "Rap / Hip-Hop", c: 34, i: "🎧" },
            { n: "R&B / Soul", c: 19, i: "🎵" },
            { n: "EDM", c: 27, i: "⚡" },
            { n: "Rock", c: 15, i: "🎸" },
            { n: "Classical", c: 11, i: "🎻" },
            { n: "Comedy", c: 22, i: "😂" },
            { n: "Indie", c: 16, i: "🌙" },
          ].map(({ n, c, i }) => (
            <button
              key={n}
              className="group border border-[#333] bg-[#0a0a0a] hover:border-[#CCFF00]/40 hover:bg-[#CCFF00]/5 transition-all p-5 text-left"
            >
              <div className="text-2xl mb-3">{i}</div>
              <div
                style={D}
                className="text-sm md:text-base font-bold uppercase tracking-wide text-white group-hover:text-[#CCFF00] transition-colors"
              >
                {n}
              </div>
              <div className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                {c} sự kiện
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
