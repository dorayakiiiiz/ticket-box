"use client";
import { useState, useEffect } from "react";
import { Ticket, Download, Loader2 } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { ticketService, MyTicketOrder } from "../../services/ticketService";
import Navbar from "../../components/layout/Navbar";

const D = { fontFamily: "'Barlow Condensed', sans-serif" };

export function fmt(n: number) { return n.toLocaleString("vi-VN"); }

// Map string to a stable color
function getColorForZone(zone: string) {
  if (zone.toLowerCase().includes("vip")) return "#C084FC";
  if (zone.toLowerCase().includes("svip")) return "#FF2D20";
  if (zone.toLowerCase().includes("sky")) return "#CCFF00";
  return "#38BDF8"; // default blue
}

function HiddenTicketTemplate({ order, ticket }: { order: MyTicketOrder; ticket: MyTicketOrder["tickets"][0] }) {
  const isUsed = ticket.status === "USED" || ticket.status === "CHECKED_IN";
  const color = getColorForZone(order.ticketType.name);
  const accentText = color === "#CCFF00" ? "#000" : "#fff";

  let dateStr = order.concert.date;
  let timeStr = "19:00";
  try {
    const dObj = new Date(order.concert.date);
    if (!isNaN(dObj.getTime())) {
      dateStr = dObj.toLocaleDateString("vi-VN");
      timeStr = dObj.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) { }

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
      <div id={`hidden-ticket-${ticket.id}`} style={{ width: '1000px', backgroundColor: '#000', color: '#fff', fontFamily: "sans-serif" }}>
        <div className="relative border border-[#333] overflow-hidden flex">
          <div className="absolute left-0 top-0 bottom-0 w-[6px]" style={{ backgroundColor: color }} />
          <div className="flex items-stretch ml-1.5 w-full">
            <div className="flex-1 p-8 bg-[#111] min-w-0">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-mono text-gray-400">{ticket.id.substring(0, 8).toUpperCase()}</span>
              </div>
              <h3 style={D} className="text-4xl font-black uppercase italic tracking-tight text-white mb-6 leading-tight truncate">{order.concert.name}</h3>
              <div className="grid grid-cols-4 gap-6 mb-8">
                {[
                  { label: "Ngày", value: dateStr },
                  { label: "Giờ", value: timeStr },
                  { label: "Địa điểm", value: order.concert.venue },
                  { label: "Thành phố", value: order.concert.city },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[11px] font-mono uppercase tracking-widest text-gray-500 mb-1">{label}</div>
                    <div className="text-sm font-bold truncate text-white">{value}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-6 pt-5 border-t border-[#333]/50">
                <div>
                  <div className="text-[11px] font-mono tracking-widest text-gray-500 uppercase mb-1">Khu vực</div>
                  <div className="text-sm font-bold uppercase truncate max-w-[200px]" style={{ color }}>{order.ticketType.name}</div>
                </div>
                <div className="w-px h-8 bg-[#333]/80"></div>
                <div>
                  <div className="text-[11px] font-mono tracking-widest text-gray-500 uppercase mb-1">Giá vé</div>
                  <div className="text-sm font-bold text-white">{fmt(order.ticketType.price)}đ</div>
                </div>
              </div>
            </div>
            <div className="w-56 bg-[#111] flex flex-col items-center justify-center p-6 gap-3 border-l border-dashed border-[#333]/50">
              <div className={`w-[140px] h-[140px] bg-white flex items-center justify-center p-2 ${isUsed ? "opacity-25" : ""}`}>
                <QRCodeSVG value={ticket.qrCode} size={140} style={{ width: "100%", height: "100%" }} />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-2">QUÉT MÃ QR</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketCard({ order, ticket }: { order: MyTicketOrder; ticket: MyTicketOrder["tickets"][0] }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const isUsed = ticket.status === "USED" || ticket.status === "CHECKED_IN";
  const color = getColorForZone(order.ticketType.name);
  const accentText = color === "#CCFF00" ? "#000" : "#fff";

  let dateStr = order.concert.date;
  let timeStr = "19:00";
  try {
    const dObj = new Date(order.concert.date);
    if (!isNaN(dObj.getTime())) {
      dateStr = dObj.toLocaleDateString("vi-VN");
      timeStr = dObj.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) { }

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const element = document.getElementById(`hidden-ticket-${ticket.id}`);
      if (!element) return;

      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: '#000000',
      });

      const link = document.createElement('a');
      link.download = `TicketZ-${order.concert.name.replace(/\s+/g, '-')}-${ticket.id.substring(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Lỗi tải ảnh:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div id={`ticket-${ticket.id}`} className={`relative border overflow-hidden transition-all group ${isUsed ? "border-[#333] opacity-60" : "border-[#333] hover:border-[#CCFF00]/40"}`}>
      {/* Left color stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: color }} />
      <div className="flex items-stretch ml-1 mr-2">
        {/* Main body */}
        <div className="flex-1 p-5 bg-[#111] min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span id={`status-tag-${ticket.id}`} className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5"
              style={!isUsed ? { backgroundColor: color, color: accentText } : { backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}>
              {isUsed ? "ĐÃ SỬ DỤNG" : "SẮP DIỄN RA"}
            </span>
            <span className="text-[9px] font-mono text-gray-400">{ticket.id.substring(0, 8).toUpperCase()}</span>
          </div>
          <h3 style={D} className="text-2xl font-black uppercase italic tracking-tight text-white mb-0.5 leading-tight">{order.concert.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mb-4">
            {[
              { label: "Ngày", value: dateStr },
              { label: "Giờ", value: timeStr },
              { label: "Địa điểm", value: order.concert.venue },
              { label: "Thành phố", value: order.concert.city },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[9px] font-mono uppercase tracking-widest text-gray-500 mb-0.5">{label}</div>
                <div className="text-xs font-bold truncate text-white">{value}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-3 border-t border-[#333]/50">
            <div>
              <div className="text-[9px] font-mono tracking-widest text-gray-500 uppercase mb-0.5">Khu vực</div>
              <div className="text-xs font-bold uppercase truncate max-w-[120px]" style={{ color }}>{order.ticketType.name}</div>
            </div>
            <div className="w-px h-6 bg-[#333]/80"></div>
            <div>
              <div className="text-[9px] font-mono tracking-widest text-gray-500 uppercase mb-0.5">Giá vé</div>
              <div className="text-xs font-bold text-white">{fmt(order.ticketType.price)}đ</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {!isUsed && (
                <button
                  id={`download-btn-${ticket.id}`}
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: color, color: accentText }}>
                  {isDownloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                  {isDownloading ? "ĐANG TẢI..." : "TẢI ẢNH"}
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Perforated divider + QR side */}
        <div className="flex items-stretch shrink-0">
          {/* <div className="w-px my-4 border-l-2 border-dashed border-[#333]/50" /> */}
          <div className="w-28 bg-[#111] flex flex-col items-center justify-center p-4 gap-2">
            <div className={`w-[72px] h-[72px] md:w-[100px] md:h-[100px] bg-white flex items-center justify-center p-1.5 ${isUsed ? "opacity-25" : ""}`}>
              <QRCodeSVG value={ticket.qrCode} size={100} style={{ width: "100%", height: "100%" }} />
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">QUÉT QR</div>
          </div>
        </div>
      </div>
      <HiddenTicketTemplate order={order} ticket={ticket} />
    </div>
  );
}

export default function MyTicketsPage() {
  const [tab, setTab] = useState<"upcoming" | "used">("upcoming");

  const [orders, setOrders] = useState<MyTicketOrder[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTickets = async () => {
      try {
        const data = await ticketService.getMyTickets();
        if (isMounted) {
          setOrders(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };
    fetchTickets();
    return () => { isMounted = false; };
  }, []);

  // Flatten orders into individual tickets
  const flatTickets: { order: MyTicketOrder; ticket: MyTicketOrder["tickets"][0] }[] = [];
  if (orders) {
    orders.forEach(order => {
      order.tickets.forEach(ticket => {
        flatTickets.push({ order, ticket });
      });
    });
  }

  const filtered = flatTickets.filter(item => {
    const isUsed = item.ticket.status === "USED";
    return tab === "used" ? isUsed : !isUsed;
  });

  const upcomingCount = flatTickets.filter(item => item.ticket.status !== "USED").length;
  const usedCount = flatTickets.filter(item => item.ticket.status === "USED").length;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#080808] text-white">
        <div className="max-w-[900px] mx-auto px-6 py-12">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-px bg-[#CCFF00]" />
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Tài khoản</span>
            </div>
            <h1 style={D} className="text-5xl font-black uppercase italic tracking-tight mb-1">VÉ CỦA TÔI</h1>
            <p className="text-sm text-gray-400">
              {isLoading ? "Đang tải dữ liệu..." : `${flatTickets.length} vé, ${upcomingCount} sắp diễn ra`}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#333] mb-8">
            {([
              { id: "upcoming" as const, label: "Sắp diễn ra", count: isLoading ? "-" : upcomingCount },
              { id: "used" as const, label: "Đã qua", count: isLoading ? "-" : usedCount },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] border-b-2 -mb-px transition-colors ${tab === t.id ? "border-[#CCFF00] text-[#CCFF00]" : "border-transparent text-gray-500 hover:text-white"}`}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-[#CCFF00] w-8 h-8 mb-4" />
              <p className="text-gray-400">Đang tải vé của bạn...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="py-24 text-center border border-red-500/30 bg-red-500/10">
              <p className="text-red-400">Đã xảy ra lỗi khi tải danh sách vé. Vui lòng thử lại sau.</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="flex flex-col gap-3">
              {filtered.map(item => <TicketCard key={item.ticket.id} order={item.order} ticket={item.ticket} />)}
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className="py-24 text-center border border-[#333]">
              <Ticket size={44} className="mx-auto text-white/10 mb-4" />
              <p style={D} className="text-2xl font-black uppercase italic text-white/20">Không có vé nào</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
