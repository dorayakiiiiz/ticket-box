'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, ShoppingCart, Ticket,
  UserCheck, Users, Brain, QrCode, LogOut, Home, Sparkles
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/concerts', label: 'Quản lý Concert', icon: FileText, exact: false },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ShoppingCart, exact: false },
  { href: '/admin/guests', label: 'Khách mời VIP', icon: Users, exact: false },
  { href: '/admin/users', label: 'Người dùng', icon: UserCheck, exact: false },
  { href: '/admin/ai-bio', label: 'AI Artist Bio', icon: Brain, exact: false },
  // { href: '/admin/checkin', label: 'Soát vé', icon: QrCode, exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="h-screen w-64 border-r border-gray-200 bg-white flex flex-col">
      {/* Logo — match Figma exactly: plain text, no icon box */}
      <div className="p-6 border-b border-gray-200">
        <Link
          href="/"
          style={D}
          className="flex items-center text-2xl font-black tracking-tight shrink-0"
        >
          Ticket
          <span className="relative flex items-center justify-center text-[#CCFF00] text-[32px] leading-none ml-[1px]">
            Z
            <Sparkles className="absolute -top-1 -right-3 w-4 h-4" />
          </span>
        </Link>
        <p className="text-xs text-gray-500 mt-1 font-medium">Organizer Page</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${active
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer Nav */}
      <div className="p-4 border-t border-gray-200 space-y-1">
        <Link
          href="/"
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Home size={16} />
          Về trang chủ
        </Link>
        <button
          onClick={() => { logout(); router.push('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
