'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, ShoppingCart, Ticket,
  UserCheck, Users, Brain, QrCode, LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

const NAV_ITEMS = [
  { href: '/admin',          label: 'Dashboard',         icon: LayoutDashboard, exact: true  },
  { href: '/admin/concerts', label: 'Quản lý Concert',   icon: FileText,        exact: false },
  { href: '/admin/orders',   label: 'Đơn hàng',          icon: ShoppingCart,     exact: false },
  { href: '/admin/tickets',  label: 'Vé điện tử',        icon: Ticket,          exact: false },
  { href: '/admin/users',    label: 'Người dùng',        icon: UserCheck,       exact: false },
  { href: '/admin/ai-bio',   label: 'AI Artist Bio',     icon: Brain,           exact: false },
  { href: '/admin/checkin',  label: 'Soát vé',           icon: QrCode,          exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
      {/* Logo — match Figma exactly: plain text, no icon box */}
      <div className="p-6 border-b border-gray-200">
        <div style={D} className="text-2xl font-black tracking-tight">
          <span className="text-gray-900">Ticket</span><span className="text-[#CCFF00]">Z</span>
        </div>
        <p className="text-xs text-gray-500 mt-1 font-medium">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
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

      {/* Logout — match Figma exactly */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => { logout(); router.push('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut size={16} />
          Về trang chủ
        </button>
      </div>
    </aside>
  );
}
