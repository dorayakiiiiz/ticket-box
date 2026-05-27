'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, Users, Star, CheckCircle, ChevronLeft, ArrowRight } from 'lucide-react';
import { concertService } from '../../../services/concertService';
import { EventInfo, ZoneInfo } from '../../../types';
import { SoldBar, Tag } from '../../../components/concert/EventCards';
import { fmt } from '../../../utils/format';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [zones, setZones] = useState<ZoneInfo[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchEvent = async () => {
      const data = await concertService.getEventById(id);
      if (data) setEvent(data);
      const z = await concertService.getZones();
      setZones(z);
    };
    fetchEvent();
  }, [id]);

  if (!event) return <div className="min-h-screen pt-20 text-center text-gray-500">Đang tải...</div>;

  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  return (
    <div className="min-h-screen">
      <div className="relative h-[52vh] overflow-hidden">
        <img src={event.image.replace("w=700&h=500", "w=1800&h=700").replace("w=800&h=600", "w=1800&h=700")} alt={event.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/50 to-transparent" />
        <button onClick={() => router.back()} className="absolute top-6 left-6 flex items-center gap-2 text-[11px] font-semibold text-white/60 hover:text-white uppercase tracking-widest transition-colors">
          <ChevronLeft size={14} /> Trở về
        </button>
        <div className="absolute bottom-6 left-6 md:left-12">
          {event.tag && <div className="mb-3"><Tag tag={event.tag} tagStyle={event.tagStyle} /></div>}
          <h1 style={{ ...D, fontSize: "clamp(32px,5.5vw,72px)" }} className="font-black uppercase italic leading-none text-white">{event.name}</h1>
          <p className="text-sm text-white/45 mt-2">{event.subtitle}</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12">
          <div>
            {/* Info bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
              {[
                { icon: <Calendar size={13} className="text-[#CCFF00]" />, label: "Ngày diễn", value: event.date },
                { icon: <Clock size={13} className="text-[#CCFF00]" />, label: "Giờ bắt đầu", value: event.time },
                { icon: <MapPin size={13} className="text-[#CCFF00]" />, label: "Địa điểm", value: event.venue },
                { icon: <Users size={13} className="text-[#CCFF00]" />, label: "Thành phố", value: event.city },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-[#0a0a0a] border border-[#222] p-4">
                  <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">{label}</span></div>
                  <div className="text-sm font-bold">{value}</div>
                </div>
              ))}
            </div>

            <div className="mb-10">
              <h2 style={D} className="text-2xl font-black uppercase italic mb-4">Về chương trình</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{event.description}</p>
            </div>

            <div className="mb-10">
              <h2 style={D} className="text-2xl font-black uppercase italic mb-4">Nghệ sĩ tham gia</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {event.artistList.map((a, i) => (
                  <div key={i} className="bg-[#0a0a0a] border border-[#222] p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#111] border border-[#333] flex items-center justify-center shrink-0"><Star size={13} className="text-[#CCFF00]" /></div>
                    <div>
                      <div className="text-sm font-bold">{a.name}</div>
                      <div className="text-[10px] text-gray-500">{a.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 style={D} className="text-2xl font-black uppercase italic mb-4">Loại vé & Giá</h2>
              <div className="flex flex-col gap-2">
                {zones.slice(0, 6).map(z => (
                  <div key={z.id} className="flex items-center justify-between bg-[#0a0a0a] border border-[#222] px-4 py-3 hover:border-[#CCFF00]/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 shrink-0" style={{ backgroundColor: z.color }} />
                      <div>
                        <div className="text-sm font-bold">{z.name}</div>
                        <div className="text-[10px] text-gray-500">{z.type} · Còn {z.available} vé</div>
                      </div>
                    </div>
                    <div className="text-sm font-black">{fmt(z.price)}đ</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky CTA */}
          <div>
            <div className="sticky top-20 bg-[#0a0a0a] border border-[#222] p-6">
              <div className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase mb-1">Vé từ</div>
              <div style={D} className="text-4xl font-black text-white mb-1">{event.price}đ</div>
              <SoldBar pct={event.sold} />
              <div className="border-t border-[#333] my-5" />
              <div className="flex flex-col gap-2 text-[11px] text-gray-400 mb-6">
                {["Vé chính hãng từ ban tổ chức", "Hoàn tiền nếu sự kiện bị hủy", "E-ticket giao ngay qua email", "Thanh toán qua MoMo, VNPAY"].map(t => (
                  <div key={t} className="flex items-center gap-2"><CheckCircle size={12} className="text-[#CCFF00]" /> {t}</div>
                ))}
              </div>
              <button onClick={() => router.push(`/booking/${event.id}`)}
                className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] py-4 hover:bg-white transition-colors flex items-center justify-center gap-2">
                Chọn khu vực & Mua vé <ArrowRight size={14} />
              </button>
              <button className="w-full mt-2 border border-[#333] text-sm font-semibold py-3 text-gray-400 hover:text-white hover:border-white/30 transition-colors bg-transparent">
                Thêm vào lịch nhắc
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
