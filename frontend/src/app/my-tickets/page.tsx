'use client';

import { useEffect, useState } from 'react';
import { ticketsService, MyOrder } from '@/services/ticketsService';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { Ticket as TicketIcon, Calendar, QrCode } from 'lucide-react';

export default function MyTicketsPage() {
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };
  const { token, initialize } = useAuthStore();
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

    if (token) {
      fetchTickets();
    } else if (token === null) {
      router.push('/');
    }
  }, [token, router]);

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

              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {order.tickets.map((ticket, index) => (
                  <div key={ticket.id} className="flex bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="p-4 flex items-center justify-center bg-white">
                      {/* Using free QR Code API to generate QR Code image from ticket.qrCode */}
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(ticket.qrCode)}`}
                        alt={`QR Code for Ticket ${ticket.id}`}
                        className="w-[120px] h-[120px] object-contain"
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-center border-l border-dashed border-zinc-800 relative">
                      <div className="absolute -left-2 top-[-10px] w-4 h-4 rounded-full bg-zinc-900 border-b border-r border-zinc-800 rotate-45"></div>
                      <div className="absolute -left-2 bottom-[-10px] w-4 h-4 rounded-full bg-zinc-900 border-t border-r border-zinc-800 rotate-45"></div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <QrCode className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs text-zinc-500 font-mono">Vé #{index + 1}</span>
                      </div>
                      <p className="font-bold text-white mb-1">{order.ticketType.name}</p>
                      <div className="mt-auto">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ticket.status === 'UNUSED' || ticket.status === 'VALID' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {ticket.status === 'UNUSED' || ticket.status === 'VALID' ? 'Chưa sử dụng' : 'Đã sử dụng'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
