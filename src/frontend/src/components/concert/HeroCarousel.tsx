"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getMinPrice } from "../../services/concertService";
import { fmt } from "../../utils/format";
import type { Concert } from "../../types";

// HeroCarousel — auto-sliding hero với fade transition
// Nhận concerts qua prop từ Server Component (page.tsx)
// Không tự fetch API, giúp tránh gọi thêm request từ phía client
export default function HeroCarousel({ concerts }: { concerts: Concert[] }) {
  const [slides] = [concerts.slice(0, 4)];
  const [cur, setCur] = useState(0);
  const [fading, setFading] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  const go = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => {
      setCur(next);
      setFading(false);
    }, 280);
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    timer.current = setInterval(() => go((cur + 1) % slides.length), 5500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [cur, go, slides.length]);

  if (slides.length === 0) {
    return (
      <section
        className="relative pt-14 bg-[#080808]"
        style={{ height: "100svh", minHeight: "600px" }}
      />
    );
  }

  const s = slides[cur];
  const price = getMinPrice(s);
  const dateStr = new Date(s.date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <section
      className="relative pt-14 overflow-hidden"
      style={{ height: "100svh", minHeight: "600px" }}
    >
      {/* Background images — all stacked, opacity toggle */}
      {slides.map((sl, i) => (
        <div
          key={sl.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === cur ? 1 : 0 }}
        >
          {sl.coverImageUrl ? (
            <img
              src={sl.coverImageUrl
                .replace("w=700", "w=1800")
                .replace("w=800", "w=1800")
                .replace("h=500", "h=900")
                .replace("h=600", "h=900")}
              alt={sl.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#111]" />
          )}
        </div>
      ))}

      {/* Gradient: dark left, fades to transparent right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #080808 0%, #080808 30%, rgba(8,8,8,0.7) 55%, rgba(8,8,8,0.1) 100%)",
        }}
      />
      {/* Bottom fade into page */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{ background: "linear-gradient(to top, #080808, transparent)" }}
      />
      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 h-24"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,8,8,0.5), transparent)",
        }}
      />

      {/* Text content */}
      <div className="relative z-10 h-full flex flex-col justify-center max-w-[1400px] mx-auto px-6 md:px-12">
        <div
          className="max-w-lg"
          style={{ opacity: fading ? 0 : 1, transition: "opacity 0.28s ease" }}
        >
          {/* Tag */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[9px] font-black tracking-[0.2em] uppercase px-2 py-1 bg-[#CCFF00] text-[#080808]">
              {s.status === "UPCOMING" ? "SẮP DIỄN RA" : s.status}
            </span>
            <span className="text-[10px] md:text-xs font-mono tracking-[0.15em] text-white/35 uppercase">
              Đáng chú ý
            </span>
          </div>

          {/* Name */}
          <h1
            style={{ ...D, fontSize: "clamp(38px,5.5vw,78px)" }}
            className="font-black uppercase italic leading-[0.88] tracking-tight text-white mb-3"
          >
            {s.name}
          </h1>

          <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/45 mb-3">
            {s.subtitle}
          </p>
          <p className="text-sm text-white/55 mb-7 leading-relaxed line-clamp-2">
            {s.description}
          </p>

          <div className="flex flex-wrap gap-5 mb-8">
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-white/55">
              <Calendar size={11} className="text-[#CCFF00]" />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-white/55">
              <MapPin size={11} className="text-[#CCFF00]" />
              <span>
                {s.venue}, {s.city}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div>
              <div className="text-[9px] text-white/35 uppercase tracking-widest mb-0.5">
                Vé từ
              </div>
              <div
                style={D}
                className="text-[32px] font-black text-white leading-none"
              >
                {fmt(price)}đ
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/concert/${s.id}`}
                className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] text-xs px-6 py-3 hover:bg-white transition-colors flex items-center gap-2"
              >
                Mua vé <ArrowRight size={12} />
              </Link>
              <Link
                href={`/concert/${s.id}`}
                className="border border-white/25 text-white text-xs font-semibold uppercase tracking-[0.1em] px-5 py-3 hover:border-white/50 transition-colors"
              >
                Xem thêm
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation strip */}
      <div className="absolute bottom-6 left-0 right-0 z-10 max-w-[1400px] mx-auto px-6 md:px-12 flex items-center gap-3">
        <button
          onClick={() => go((cur - 1 + slides.length) % slides.length)}
          className="border border-white/15 text-white/50 hover:border-white/40 hover:text-white transition-all p-2"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="transition-all duration-300"
              style={{
                width: i === cur ? "26px" : "7px",
                height: "3px",
                backgroundColor:
                  i === cur ? "#CCFF00" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
        <button
          onClick={() => go((cur + 1) % slides.length)}
          className="border border-white/15 text-white/50 hover:border-white/40 hover:text-white transition-all p-2"
        >
          <ChevronRight size={15} />
        </button>
        <span className="ml-auto font-mono text-[10px] text-white/25">
          {String(cur + 1).padStart(2, "0")} /{" "}
          {String(slides.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}
