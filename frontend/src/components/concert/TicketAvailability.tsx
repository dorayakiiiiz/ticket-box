"use client";
import useSWR from "swr";
import { availabilityFetcher } from "../../services/concertService";
import type { TicketType, ConcertAvailability } from "../../types";
import { fmt } from "../../utils/format";
import { SoldBar } from "./EventCards";

interface Props {
  concertId: string;
  // fallback từ Server Component (Postgres data) — hiển thị ngay khi SWR chưa load
  // và làm backup khi SWR lỗi (backend down không crash UI)
  fallbackTicketTypes: TicketType[];
}

// Mini skeleton row cho loading state
function SkeletonRow() {
  return (
    <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#222] px-4 py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-white/10 shrink-0" />
        <div>
          <div className="h-4 w-24 bg-white/10 mb-1" />
          <div className="h-3 w-16 bg-white/5" />
        </div>
      </div>
      <div className="h-4 w-16 bg-white/10" />
    </div>
  );
}

export default function TicketAvailability({
  concertId,
  fallbackTicketTypes,
}: Props) {
  // Poll mỗi 5 giây. Chỉ phần số vé thay đổi, không re-render toàn trang.
  // fallbackData hiển thị ngay lập tức từ data Postgres (Server Component pass xuống)
  // giúp tránh flash trắng khi SWR chưa load xong.
  const { data, error, isLoading } = useSWR<ConcertAvailability>(
    `/concerts/${concertId}/availability`,
    availabilityFetcher,
    {
      refreshInterval: 5000,
      // Dùng Postgres data làm initial display — không bị flash khi SWR chưa load xong
      fallbackData: {
        concertId,
        updatedAt: new Date().toISOString(),
        ticketTypes: fallbackTicketTypes.map((t) => ({
          id: t.id,
          name: t.name,
          colorCode: t.colorCode,
          totalQuantity: t.totalQuantity,
          available: t.totalQuantity - t.soldQuantity,
          soldOut: t.soldQuantity >= t.totalQuantity,
        })),
      },
      // Không retry liên tục khi lỗi — giảm spam request khi backend down
      onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 10000);
      },
    },
  );

  // SWR đang fetch lần đầu và chưa có fallback, hiển thị skeleton trước
  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(fallbackTicketTypes.length || 2)].map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  // SWR lỗi và không có fallback — tình huống hiếm
  if (error && !data) {
    return (
      <div className="text-sm text-gray-500 italic px-4 py-3 border border-[#222] bg-[#0a0a0a]">
        Không thể tải thông tin vé. Vui lòng thử lại sau.
      </div>
    );
  }

  const ticketTypes = data?.ticketTypes ?? [];

  // Tính sold percent dựa trên data real-time từ SWR
  const totalQty = ticketTypes.reduce((s, t) => s + t.totalQuantity, 0);
  const totalSold = ticketTypes.reduce(
    (s, t) => s + (t.totalQuantity - t.available),
    0,
  );
  const overallPct =
    totalQty > 0 ? Math.round((totalSold / totalQty) * 100) : 0;

  return (
    <div>
      {/* Badge khi SWR lỗi nhưng vẫn có fallback data */}
      {error && data && (
        <div className="text-[10px] md:text-xs text-gray-500 italic mb-2 text-right">
          Đang cập nhật...
        </div>
      )}

      {/* Overall sold bar — real-time từ Redis qua SWR */}
      <SoldBar pct={overallPct} />

      <div className="border-t border-[#333] my-5" />

      {/* Danh sách loại vé với số vé real-time */}
      <div className="flex flex-col gap-2">
        {ticketTypes.map((t) => {
          const pct =
            t.totalQuantity > 0
              ? Math.round(
                  ((t.totalQuantity - t.available) / t.totalQuantity) * 100,
                )
              : 100;

          return (
            <div
              key={t.id}
              className={`flex items-center justify-between bg-[#0a0a0a] border px-4 py-3 transition-colors ${
                t.soldOut
                  ? "border-[#333] opacity-60"
                  : "border-[#222] hover:border-[#CCFF00]/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 shrink-0"
                  style={{ backgroundColor: t.colorCode || "#CCFF00" }}
                />
                <div>
                  <div className="text-sm md:text-base font-bold">{t.name}</div>
                  <div className="text-[10px] md:text-xs text-gray-500">
                    {t.soldOut ? (
                      <span className="text-[#FF2D20] font-semibold">
                        Hết vé
                      </span>
                    ) : (
                      <>
                        Còn {t.available} vé · {pct}% đã bán
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-sm md:text-base font-black">
                {/* Giá lấy từ fallbackTicketTypes vì availability response không trả price */}
                {fmt(
                  fallbackTicketTypes.find((ft) => ft.id === t.id)?.price ?? 0,
                )}
                đ
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
