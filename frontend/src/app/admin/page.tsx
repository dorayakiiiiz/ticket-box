'use client';
import Link from 'next/link';
import { DollarSign, Ticket, Calendar, UserCheck, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { adminService, type DashboardData } from '../../services/adminService';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
function fmt(n: number) { return n.toLocaleString('vi-VN'); }

function formatCurrencyShort(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

function AdminStatCard({ title, value, icon, sub }: { title: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="w-10 h-10 bg-gray-100 flex items-center justify-center text-gray-600">
          {icon}
        </div>
      </div>
      <p style={D} className="text-3xl font-black text-gray-900 mb-2">{value}</p>
      {sub && (
        <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
          <TrendingUp size={12} />
          {sub}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [revenueRange, setRevenueRange] = useState<'7d' | '30d'>('7d');
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    adminService.getDashboard(revenueRange)
      .then(setData)
      .catch(() => setError('Không thể tải dữ liệu dashboard.'))
      .finally(() => setIsLoading(false));
  }, [revenueRange]);

  const stats = data?.stats;
  const chart = data?.revenueChart ?? [];
  const concerts = data?.concertPerformance ?? [];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-500 text-sm">
          {stats ? `Cập nhật lúc ${new Date(stats.updatedAt).toLocaleString('vi-VN')}` : 'Đang tải...'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStatCard title="Tổng doanh thu" value={stats ? `${formatCurrencyShort(stats.totalRevenue)} đ` : '--'} icon={<DollarSign size={20} />} />
        <AdminStatCard title="Vé đã bán" value={stats ? fmt(stats.totalTicketsSold) : '--'} icon={<Ticket size={20} />} />
        <AdminStatCard title="Sự kiện sắp diễn" value={stats ? String(stats.activeEvents) : '--'} icon={<Calendar size={20} />} />
        <AdminStatCard title="Đã check-in hôm nay" value={stats ? String(stats.checkedInToday) : '--'} icon={<UserCheck size={20} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        <div className="bg-white border border-gray-200 flex flex-col h-[500px]">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 style={D} className="text-lg font-black uppercase italic text-gray-900">Doanh thu & Lượng bán</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">Theo tuần · VNĐ</p>
            </div>
            <div className="flex gap-1">
              {(["7d", "30d"] as const).map(r => (
                <button key={r} onClick={() => setRevenueRange(r)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${revenueRange === r ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                  {r === "7d" ? "7 ngày" : "30 ngày"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col px-5 pt-5 pb-4 min-h-0">
            <div style={{ minHeight: 160 }}>
              {mounted && !isLoading && chart.length > 0 && (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#111827" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => formatCurrencyShort(v as number)} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={38} />
                    <Tooltip formatter={(v: any, name: any) => [
                      name === "revenue" ? `${formatCurrencyShort(Number(v))} đ` : Number(v).toLocaleString("vi-VN") + " vé",
                      name === "revenue" ? "Doanh thu" : "Vé bán"
                    ]} contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 0, fontSize: 11 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={1.5} fill="url(#revGrad)" dot={{ r: 2.5, fill: "#111827" }} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {isLoading && <div className="h-40 flex items-center justify-center text-sm text-gray-400">Đang tải...</div>}
              {!isLoading && chart.length === 0 && <div className="h-40 flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu</div>}
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Số vé bán theo tuần</p>
              {mounted && !isLoading && chart.length > 0 && (
                <ResponsiveContainer width="100%" height={52}>
                  <BarChart data={chart} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" hide />
                    <Tooltip formatter={(v: any) => [Number(v).toLocaleString("vi-VN") + " vé", "Vé bán"]} contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 0, fontSize: 11 }} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="tickets" radius={0}>
                      {chart.map((_, i) => (
                        <Cell key={i} fill={i === chart.length - 1 ? "#374151" : "#e5e7eb"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 flex flex-col h-[500px]">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 style={D} className="text-lg font-black uppercase italic text-gray-900">Hiệu suất Concert</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">% vé đã bán · xếp theo doanh thu</p>
            </div>
            <Link href="/admin/concerts" className="text-[10px] font-semibold text-gray-400 hover:text-gray-700 transition-colors">
              Xem tất cả →
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {concerts.map((c, i) => {
              const barColor = c.soldPercent >= 90 ? "#dc2626" : c.soldPercent >= 70 ? "#ea580c" : "#6b7280";
              return (
                <Link href="/admin/concerts" key={c.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <span className="text-xs font-mono text-gray-300 w-4 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={D} className="text-sm font-black uppercase text-gray-800 truncate pr-2">{c.name}</span>
                      <span className="text-xs font-bold shrink-0 tabular-nums" style={{ color: barColor }}>{c.soldPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 w-full rounded-none">
                      <div className="h-full" style={{ width: `${c.soldPercent}%`, backgroundColor: barColor }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400">{fmt(c.soldQuantity)}/{fmt(c.totalQuantity)} vé</span>
                      <span className="text-[10px] font-semibold text-gray-500">{formatCurrencyShort(c.revenue)} đ</span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {isLoading && <div className="py-8 text-center text-sm text-gray-400">Đang tải...</div>}
          </div>

          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">Tổng doanh thu</span>
            <span style={D} className="text-xl font-black text-gray-900">
              {stats ? `${formatCurrencyShort(stats.totalRevenue)} đồng` : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
