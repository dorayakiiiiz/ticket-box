"use client";
import { useState, Suspense, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { concertService, formatConcertDate, getMinPrice } from "@/services/concertService";
import type { Concert } from "@/types";

const D = { fontFamily: "'Barlow Condensed', sans-serif" };

function SmallCard({ event }: { event: Concert }) {
  const router = useRouter();

  return (
    <button onClick={() => router.push(`/concert/${event.id}`)}
      className="group relative block w-full text-left bg-black border border-[#222] overflow-hidden hover:border-[#CCFF00]/40 transition-colors">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img src={event.coverImageUrl || "https://placehold.co/400x300/111/444?text=No+Image"} alt={event.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
        {event.status === 'COMPLETED' && (
          <span className="absolute top-2 right-2 text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 bg-gray-500 text-white">
            ĐÃ DIỄN RA
          </span>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 style={D} className="text-xl font-black uppercase italic tracking-tight text-white leading-tight drop-shadow-lg">
            {event.name}
          </h3>
          <p className="text-[10px] text-gray-300 line-clamp-1 drop-shadow-md">{event.subtitle}</p>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-2">
          <span>{formatConcertDate(event.date)}</span>
          <span>{event.city}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#CCFF00] border border-[#CCFF00]/30 px-1.5 py-0.5">
            CONCERT
          </span>
          <span className="text-sm font-bold text-white">Từ {getMinPrice(event).toLocaleString()}đ</span>
        </div>
      </div>
    </button>
  );
}

const LIMIT = 12;

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [input, setInput] = useState(initialQuery);
  const [current, setCurrent] = useState(initialQuery);
  
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchConcerts = useCallback(
    async (page: number, searchVal: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await concertService.searchConcerts(page, LIMIT, searchVal);
        setConcerts(result.data);
        setTotalPages(result.meta.totalPages);
        setTotal(result.meta.total);
        setCurrentPage(result.meta.page);
      } catch {
        setError("Không thể tải kết quả tìm kiếm.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initialQuery !== current) {
      setInput(initialQuery);
      setCurrent(initialQuery);
      setCurrentPage(1);
    }
  }, [initialQuery, current]);

  useEffect(() => {
    fetchConcerts(currentPage, current);
  }, [currentPage, current, fetchConcerts]);

  const handleSuggestionClick = (s: string) => {
    setInput(s);
    setCurrent(s);
    setCurrentPage(1);
    router.push(`/search?q=${encodeURIComponent(s)}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        {/* Search header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-px bg-[#CCFF00]" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Kết quả</span>
          </div>
          <h1 style={D} className="text-4xl font-black uppercase italic tracking-tight leading-none">
            "{current}"
            <span className="text-gray-500 text-2xl ml-3">— {total} kết quả</span>
          </h1>
        </div>

        {isLoading ? (
          <div className="py-24 text-center text-gray-500">
            Đang tải...
          </div>
        ) : error ? (
          <div className="py-24 text-center text-red-500 border border-[#333]">
            {error}
          </div>
        ) : concerts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {concerts.map(ev => <SmallCard key={ev.id} event={ev} />)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#222] pt-6">
                <p className="text-xs text-gray-500">
                  Hiển thị <span className="text-white">{(currentPage - 1) * LIMIT + 1}</span> đến <span className="text-white">{Math.min(currentPage * LIMIT, total)}</span> trong <span className="text-white">{total}</span>
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="flex items-center justify-center w-8 h-8 border border-[#333] text-gray-400 bg-black disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`flex items-center justify-center w-8 h-8 border text-xs font-bold transition-colors ${
                        p === currentPage
                          ? "border-[#CCFF00] bg-[#CCFF00] text-black"
                          : "border-[#333] bg-black text-gray-400 hover:border-[#CCFF00] hover:text-[#CCFF00]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="flex items-center justify-center w-8 h-8 border border-[#333] text-gray-400 bg-black disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-24 text-center border border-[#333]">
            <div style={D} className="text-8xl font-black uppercase italic text-white/[0.03] mb-2 select-none">404</div>
            <Search size={40} className="mx-auto text-white/10 mb-4" />
            <p style={D} className="text-2xl font-black uppercase italic text-white/20 mb-2">Không tìm thấy</p>
            <p className="text-sm text-gray-500 mb-6">Thử tìm với từ khóa khác</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Hồ Chí Minh", "Hà Nội", "Anh Trai", "Concert"].map(s => (
                <button key={s} onClick={() => handleSuggestionClick(s)}
                  className="border border-[#333] text-[11px] font-semibold px-4 py-2 text-gray-400 hover:border-[#CCFF00]/40 hover:text-white transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-[#080808] pt-14" />}>
        <SearchResultsContent />
      </Suspense>
    </>
  );
}
