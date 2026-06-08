'use client';

import { useEffect, useState } from 'react';
import { ticketsService, MyOrder } from '@/services/ticketsService';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { Ticket as TicketIcon, Calendar, QrCode } from 'lucide-react';

export default function MyTicketsPage() {
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };
  const { token, initialize, isInitialized } = useAuthStore();
  const router = useRouter();
  
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const data = await ticketsService.getMyTickets();
        setOrders(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Có lỗi xảy ra khi tải danh sách vé.');
      } finally {
        setLoading(false);
      }
    };

    if (isInitialized) {
      if (token) {
        fetchTickets();
      } else {
        router.push('/');
      }
    }
  }, [token, isInitialized, router]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400">Đang tải danh sách vé...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-zinc-800 text-white px-6 py-2 rounded-lg hover:bg-zinc-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] p-6 max-w-5xl mx-auto">
      <h1 style={D} className="text-5xl font-black uppercase italic mb-8 text-center text-emerald-400">
        Vé của tôi
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <TicketIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">Bạn chưa có vé nào.</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-6 bg-emerald-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-emerald-400 transition"
          >
            Mua vé ngay
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <div key={order.orderId} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="bg-zinc-800/50 p-4 sm:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{order.concert.name}</h2>
                  <div className="flex items-center text-zinc-400 gap-2 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(order.concert.date).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-zinc-500 mb-1">Mã đơn: <span className="text-emerald-500 font-mono">{order.orderCode}</span></p>
                  <p className="text-sm text-zinc-400">
                    <span className="font-semibold text-white">{order.quantity} vé</span> {order.ticketType.name}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-6 grid grid-cols-1 gap-6">
                {order.tickets.map((ticket, index) => {
                  const accentColor = '#10b981'; // emerald-500
                  return (
                  <div key={ticket.id} className="relative overflow-hidden border border-white/10 bg-[#111] flex flex-col sm:flex-row w-full rounded-none">
                    {/* Left accent stripe */}
                    <div className="w-1.5 shrink-0 hidden sm:block" style={{ backgroundColor: accentColor }} />
                    {/* Top accent stripe for mobile */}
                    <div className="h-1.5 w-full sm:hidden" style={{ backgroundColor: accentColor }} />

                    {/* Left section: Info */}
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-5">
                          <div>
                            <div style={D} className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase mb-1">VITICKET — E-TICKET</div>
                            <h1 style={D} className="text-2xl sm:text-3xl font-black uppercase italic leading-none text-white">{order.concert.name}</h1>
                            <p className="text-xs sm:text-sm font-semibold tracking-[0.06em] mt-1.5" style={{ color: accentColor }}>{order.ticketType.name}</p>
                          </div>
                          <div className="shrink-0 text-right hidden sm:block">
                            <div className="text-[9px] font-mono text-zinc-500 mb-1">VÉ SỐ</div>
                            <div className="font-mono font-bold text-sm text-white">#{index + 1}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-zinc-500 mb-1">Thời gian</div>
                            <div className="text-xs sm:text-sm font-bold text-white">{new Date(order.concert.date).toLocaleString('vi-VN')}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-zinc-500 mb-1">Giá trị</div>
                            <div style={D} className="text-lg sm:text-xl font-black text-white">{order.ticketType.price.toLocaleString('vi-VN')}đ</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Trạng thái */}
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-none text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                          ticket.status === 'UNUSED' || ticket.status === 'VALID' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {ticket.status === 'UNUSED' || ticket.status === 'VALID' ? 'Chưa sử dụng' : 'Đã sử dụng'}
                        </span>
                      </div>
                    </div>

                    {/* Perforation */}
                    <div className="flex sm:flex-col items-center">
                      <div className="w-5 h-5 -mt-2.5 sm:-ml-2.5 sm:mt-0 rounded-full bg-[#09090b] border-b sm:border-b-0 sm:border-r border-white/10 sm:block" />
                      <div className="flex-1 border-t sm:border-t-0 sm:border-l border-dashed border-white/12 w-full sm:w-0 sm:h-full" />
                      <div className="w-5 h-5 -mb-2.5 sm:-mr-2.5 sm:mb-0 rounded-full bg-[#09090b] border-t sm:border-t-0 sm:border-l border-white/10 sm:block" />
                    </div>

                    {/* Right section: QR Code */}
                    <div className="p-5 sm:p-6 flex flex-col items-center justify-center shrink-0">
                      <div className="bg-white p-2 rounded mb-2">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(ticket.qrCode)}`}
                          alt={`QR Code for Ticket ${ticket.id}`}
                          className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] object-contain"
                        />
                      </div>
                      <div className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">Mã quét vào cổng</div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
