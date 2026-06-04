// Server Component, không dùng "use client"
// Dùng ISR với revalidate 60 giây theo từng route
// Thông tin concert ít thay đổi nên cache ở server là hợp lý
// Phần số vé cần real-time, tách riêng thành Client Component <TicketAvailability>
import { notFound } from "next/navigation";
import { Calendar, Clock, MapPin, Users, CheckCircle } from "lucide-react";
import { getMinPrice } from "../../../services/concertService";
import TicketAvailability from "../../../components/concert/TicketAvailability";
import { fmt } from "../../../utils/format";
import type { Concert } from "../../../types";
import BackButton from "../../../components/concert/BackButton";
import BookingButton from "../../../components/concert/BookingButton";

// URL backend — nhất quán với homepage
const API =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ??
  "http://localhost:8080";

// Fetch concert detail với ISR revalidate 60s
async function getConcert(id: string): Promise<Concert | null> {
  try {
    const res = await fetch(`${API}/concerts/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const concert = await getConcert(id);

  // 404 nếu không tìm thấy — Next.js tự render not-found page
  if (!concert) notFound();

  const D = { fontFamily: "'Barlow Condensed', sans-serif" };
  const price = getMinPrice(concert);
  const dateStr = new Date(concert.date).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = new Date(concert.date).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen">
      {/* Hero cover — render server-side */}
      <div className="relative h-[52vh] overflow-hidden">
        {concert.coverImageUrl ? (
          <img
            src={concert.coverImageUrl
              .replace("w=700", "w=1800")
              .replace("w=800", "w=1800")
              .replace("h=500", "h=700")
              .replace("h=600", "h=700")}
            alt={concert.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#111]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/50 to-transparent" />

        {/* Back button — Client Component nhỏ vì cần router.back() */}
        <BackButton />

        <div className="absolute bottom-6 left-6 md:left-12">
          <h1
            style={{ ...D, fontSize: "clamp(32px,5.5vw,72px)" }}
            className="font-black uppercase italic leading-none text-white"
          >
            {concert.name}
          </h1>
          <p className="text-sm md:text-base text-white/45 mt-2">{concert.subtitle}</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12">
          {/* ── Cột trái: Thông tin concert (server-side, ISR cache) ── */}
          <div>
            {/* Info bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
              {[
                {
                  icon: <Calendar size={13} className="text-[#CCFF00]" />,
                  label: "Ngày diễn",
                  value: dateStr,
                },
                {
                  icon: <Clock size={13} className="text-[#CCFF00]" />,
                  label: "Giờ bắt đầu",
                  value: timeStr,
                },
                {
                  icon: <MapPin size={13} className="text-[#CCFF00]" />,
                  label: "Địa điểm",
                  value: concert.venue,
                },
                {
                  icon: <Users size={13} className="text-[#CCFF00]" />,
                  label: "Thành phố",
                  value: concert.city,
                },
              ].map(({ icon, label, value }) => (
                <div
                  key={label}
                  className="bg-[#0a0a0a] border border-[#222] p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-widest text-gray-500">
                      {label}
                    </span>
                  </div>
                  <div className="text-sm md:text-base font-bold">{value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="mb-10">
              <h2
                style={D}
                className="text-2xl font-black uppercase italic mb-4"
              >
                Về chương trình
              </h2>
              <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                {concert.description}
              </p>
            </div>

            {/* AI Bio */}
            {concert.aiBio && (
              <div className="mb-10">
                <h2
                  style={D}
                  className="text-2xl font-black uppercase italic mb-4"
                >
                  Giới thiệu nghệ sĩ
                </h2>
                <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                  {concert.aiBio}
                </p>
              </div>
            )}

            {/* Ticket types — title + TicketAvailability Client Component */}
            {concert.ticketTypes?.length > 0 && (
              <div>
                <h2
                  style={D}
                  className="text-2xl font-black uppercase italic mb-4"
                >
                  Loại vé & Giá
                </h2>
                {/* TicketAvailability là Client Component, poll SWR mỗi 5 giây.
                    Chỉ phần số vé được cập nhật, không re-render lại toàn trang.
                    fallbackTicketTypes là data từ Postgres, hiển thị ngay khi SWR chưa fetch xong. */}
                <TicketAvailability
                  concertId={concert.id}
                  fallbackTicketTypes={concert.ticketTypes}
                />
              </div>
            )}
          </div>

          {/* ── Cột phải: Sticky CTA (Client Component vì có router.push) ── */}
          <div>
            <div className="sticky top-20 bg-[#0a0a0a] border border-[#222] p-6">
              <div className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-gray-500 uppercase mb-1">
                Vé từ
              </div>
              <div style={D} className="text-4xl font-black text-white mb-1">
                {fmt(price)}đ
              </div>

              <div className="border-t border-[#333] my-5" />

              <div className="flex flex-col gap-2 text-[11px] md:text-xs text-gray-400 mb-6">
                {[
                  "Vé chính hãng từ ban tổ chức",
                  "Hoàn tiền nếu sự kiện bị hủy",
                  "E-ticket giao ngay qua email",
                  "Thanh toán qua MoMo, VNPAY",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <CheckCircle size={12} className="text-[#CCFF00]" /> {t}
                  </div>
                ))}
              </div>

              {/* BookingButton — Client Component nhỏ vì cần router.push */}
              <BookingButton concertId={concert.id} />

              <button className="w-full mt-2 border border-[#333] text-sm md:text-base font-semibold py-3 text-gray-400 hover:text-white hover:border-white/30 transition-colors bg-transparent">
                Thêm vào lịch nhắc
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
