// Server Component — không có "use client"
// Dùng ISR: fetch danh sách concert từ backend, revalidate mỗi 60 giây
// Next.js build trang thành HTML tĩnh và cache lại ở server.
// Mọi user đều nhận từ cache, không gọi DB mỗi request.
// Sau 60 giây, Next.js tự rebuild lại trong nền nếu có dữ liệu mới.
import Link from "next/link";
import { ArrowRight, Ticket, Play } from "lucide-react";
import HeroCarousel from "@/components/concert/HeroCarousel";
import { SmallCard, FeaturedCard } from "@/components/concert/EventCards";
import TickerBanner from "@/components/concert/TickerBanner";
import { getAllConcerts, getMinPrice, formatConcertDate } from "@/services/concertService";
import { fmt } from "@/utils/format";
import type { Concert } from "@/types";


export default async function HomePage() {
  // Data được fetch server-side, cache theo ISR
  const concerts = await getAllConcerts();

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
                Highlight
              </span>
            </div>
            <h2
              style={D}
              className="text-4xl font-black uppercase italic tracking-tight"
            >
              SỰ KIỆN NỔI BẬT
            </h2>
          </div>
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
            <Link href="/" className="border border-white/30 text-white font-semibold uppercase tracking-[0.12em] text-xs md:text-sm px-10 py-4 hover:border-white transition-colors flex items-center gap-2 justify-center">
              ĐẶT VÉ NGAY <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
