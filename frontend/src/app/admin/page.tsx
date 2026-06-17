'use client';
import Link from 'next/link';
import { DollarSign, Ticket, Calendar, Users, TrendingUp, UserCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
function fmt(n: number) { return n.toLocaleString('vi-VN'); }

function AdminStatCard({ title, value, icon, trend, trendValue }: { title: string; value: string; icon: React.ReactNode; trend?: 'up' | 'down'; trendValue?: string }) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="w-10 h-10 bg-gray-100 flex items-center justify-center text-gray-600">
          {icon}
        </div>
      </div>
      <p style={D} className="text-3xl font-black text-gray-900 mb-2">{value}</p>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          <TrendingUp size={12} className={trend === 'down' ? 'rotate-180' : ''} />
          {trendValue}
        </div>
      )}
    </div>
  );
}

const REVENUE_CHART_DATA = [
  { day: "10/05", revenue: 3200000000, tickets: 890 },
  { day: "17/05", revenue: 5800000000, tickets: 1420 },
  { day: "24/05", revenue: 4100000000, tickets: 1100 },
  { day: "31/05", revenue: 7600000000, tickets: 2050 },
  { day: "07/06", revenue: 9200000000, tickets: 2340 },
  { day: "14/06", revenue: 12400000000, tickets: 3180 },
  { day: "17/06", revenue: 6300000000, tickets: 1867 },
];

const CONCERT_PERF = [
  { name: "ANH TRAI SAY HI",    sold: 93, total: 8000, revenue: 18600000000, status: "ĐANG BÁN",  id: 1 },
  { name: "MỸ TÂM TOUR 2026",   sold: 71, total: 3000, revenue: 12580000000, status: "ĐANG BÁN",  id: 5 },
  { name: "AFTERPARTY FESTIVAL", sold: 58, total: 5000, revenue: 8700000000,  status: "ĐANG BÁN",  id: 6 },
  { name: "BINZ × TOULIVER",    sold: 94, total: 2000, revenue: 7540000000,  status: "GẦN HẾT VÉ", id: 3 },
  { name: "RAP VIỆT ALL-STARS", sold: 62, total: 4000, revenue: 6200000000,  status: "ĐANG BÁN",  id: 2 },
  { name: "ĐEN VÂU — TRỜI ƠI!", sold: 45, total: 3500, revenue: 3150000000,  status: "ĐANG BÁN",  id: 4 },
];

export default function AdminDashboard() {
  const [revenueRange, setRevenueRange] = useState<"7d" | "30d">("7d");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalRevenue = CONCERT_PERF.reduce((s, c) => s + c.revenue, 0);
  const totalTickets = CONCERT_PERF.reduce((s, c) => s + Math.round((c.total * c.sold) / 100), 0);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-500 text-sm">Cập nhật lúc 17/06/2026, 14:32</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStatCard title="Tổng doanh thu" value={`${(totalRevenue / 1e9).toFixed(1)}B đ`} icon={<DollarSign size={20} />} trend="up" trendValue="+12.5% so với tháng trước" />
        <AdminStatCard title="Vé đã bán" value={totalTickets.toLocaleString("vi-VN")} icon={<Ticket size={20} />} trend="up" trendValue="+8.2% so với tháng trước" />
        <AdminStatCard title="Sự kiện đang bán" value="8" icon={<Calendar size={20} />} />
        <AdminStatCard title="Đã check-in hôm nay" value="142" icon={<UserCheck size={20} />} trend="up" trendValue="2 vé trong 1 giờ qua" />
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
            <div className="flex-1 min-h-[160px]">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REVENUE_CHART_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#111827" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${(v / 1e9).toFixed(1)}B`} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={38} />
                    <Tooltip formatter={(v: number, name: string) => [
                      name === "revenue" ? `${(v / 1e9).toFixed(2)}B đ` : v.toLocaleString("vi-VN") + " vé",
                      name === "revenue" ? "Doanh thu" : "Vé bán"
                    ]} contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 0, fontSize: 11 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={1.5} fill="url(#revGrad)" dot={{ r: 2.5, fill: "#111827" }} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Số vé bán theo tuần</p>
              {mounted && (
                <ResponsiveContainer width="100%" height={52}>
                  <BarChart data={REVENUE_CHART_DATA} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} hide />
                    <Tooltip formatter={(v: number) => [v.toLocaleString("vi-VN") + " vé", "Vé bán"]} contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 0, fontSize: 11 }} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="tickets" radius={0}>
                      {REVENUE_CHART_DATA.map((_, i) => (
                        <Cell key={i} fill={i === REVENUE_CHART_DATA.length - 1 ? "#374151" : "#e5e7eb"} />
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
            {CONCERT_PERF.map((c, i) => {
              const pct = c.sold;
              const soldCount = Math.round((c.total * pct) / 100);
              const barColor = pct >= 90 ? "#dc2626" : pct >= 70 ? "#ea580c" : "#6b7280";

              return (
                <Link href="/admin/concerts" key={c.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <span className="text-xs font-mono text-gray-300 w-4 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={D} className="text-sm font-black uppercase text-gray-800 truncate pr-2">{c.name}</span>
                      <span className="text-xs font-bold shrink-0 tabular-nums" style={{ color: barColor }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 w-full rounded-none">
                      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400">{soldCount.toLocaleString("vi-VN")}/{c.total.toLocaleString("vi-VN")} vé</span>
                      <span className="text-[10px] font-semibold text-gray-500">{(c.revenue / 1e9).toFixed(1)}B đ</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">Tổng doanh thu</span>
            <span style={D} className="text-xl font-black text-gray-900">{(totalRevenue / 1e9).toFixed(1)} tỷ đồng</span>
          </div>
        </div>
      </div>
    </div>
  );
}
