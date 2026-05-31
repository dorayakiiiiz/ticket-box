"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import {
  concertService,
  getMinPrice,
  getSoldPercent,
} from "../../../services/concertService";
import { SoldBar } from "../../../components/concert/EventCards";
import { fmt } from "../../../utils/format";
import type { Concert } from "../../../types";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [concert, setConcert] = useState<Concert | null>(null);

  useEffect(() => {
    if (!id) return;
    concertService
      .getById(id)
      .then(setConcert)
      .catch(() => {});
  }, [id]);

  if (!concert)
    return (
      <div className="min-h-screen pt-20 text-center text-gray-500">
        Đang tải...
      </div>
    );

  const D = { fontFamily: "'Barlow Condensed', sans-serif" };
  const price = getMinPrice(concert);
  const sold = getSoldPercent(concert);
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
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 flex items-center gap-2 text-[11px] md:text-xs font-semibold text-white/60 hover:text-white uppercase tracking-widest transition-colors"
        >
          <ChevronLeft size={14} /> Trở về
        </button>
        <div className="absolute bottom-6 left-6 md:left-12">
          <h1
            style={{ ...D, fontSize: "clamp(32px,5.5vw,72px)" }}
            className="font-black uppercase italic leading-none text-white"
          >
            {concert.name}
          </h1>
          <p className="text-sm text-white/45 mt-2">{concert.subtitle}</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12">
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
              <p className="text-sm text-gray-400 leading-relaxed">
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
                <p className="text-sm text-gray-400 leading-relaxed">
                  {concert.aiBio}
                </p>
              </div>
            )}

            {/* Ticket types */}
            {concert.ticketTypes?.length > 0 && (
              <div>
                <h2
                  style={D}
                  className="text-2xl font-black uppercase italic mb-4"
                >
                  Loại vé & Giá
                </h2>
                <div className="flex flex-col gap-2">
                  {concert.ticketTypes.map((t) => {
                    const remaining = t.totalQuantity - t.soldQuantity;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between bg-[#0a0a0a] border border-[#222] px-4 py-3 hover:border-[#CCFF00]/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 shrink-0"
                            style={{
                              backgroundColor: t.colorCode || "#CCFF00",
                            }}
                          />
                          <div>
                            <div className="text-sm font-bold">{t.name}</div>
                            <div className="text-[10px] text-gray-500">
                              Còn {remaining} vé · Tối đa {t.maxPerUser}/người
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-black">
                          {fmt(t.price)}đ
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky CTA */}
          <div>
            <div className="sticky top-20 bg-[#0a0a0a] border border-[#222] p-6">
              <div className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase mb-1">
                Vé từ
              </div>
              <div style={D} className="text-4xl font-black text-white mb-1">
                {fmt(price)}đ
              </div>
              <SoldBar pct={sold} />
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
              <button
                onClick={() => router.push(`/booking/${concert.id}`)}
                className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] py-4 hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                Chọn khu vực & Mua vé <ArrowRight size={14} />
              </button>
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
