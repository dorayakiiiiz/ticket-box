'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <aside className="w-[260px] shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-screen shadow-sm">
      {/* Logo — click để quay về trang chính */}
      <div className="px-6 py-5 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5 group w-fit">
          <div className="w-8 h-8 rounded-lg bg-[#111] flex items-center justify-center">
            <span className="text-[#CCFF00] font-black text-xs">Z</span>
          </div>
          <div>
            <div className="text-[15px] font-bold text-slate-900 tracking-tight group-hover:text-slate-700 transition-colors" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Ticket<span className="text-[#CCFF00]">Z</span>
            </div>
            <div className="text-[10px] font-medium text-slate-400 tracking-wide uppercase group-hover:text-slate-500 transition-colors">
              Admin Panel
            </div>
          </div>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <div className="px-3 mb-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Menu</span>
        </div>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                active
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} className={active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="text-indigo-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-slate-100">
        {user && (
          <div className="px-3 py-2.5 mb-2 rounded-lg bg-slate-50">
            <div className="text-[12px] font-medium text-slate-700 truncate">{user.email}</div>
            <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide mt-0.5">{user.role}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
