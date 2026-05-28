'use client';
import { useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';
import Link from 'next/link';
import AuthModal from '../auth/AuthModal';
import { useAuthStore } from '../../stores/authStore';
import { useEffect } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user, isAuthenticated, initialize, logout } = useAuthStore();
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#222] bg-[#080808]/95 backdrop-blur-sm text-white">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" style={D} className="flex items-center text-2xl font-black tracking-tight">
            Ticket
            <span className="relative flex items-center justify-center text-[#CCFF00] text-[32px] leading-none ml-[1px]">
              Z
              <Sparkles className="absolute -top-1 -right-3 w-4 h-4 text-white fill-white" />
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            {["Sự Kiện", "Nghệ Sĩ", "Địa Điểm", "Khuyến Mãi"].map(l => (
              <Link key={l} href="/" className="hover:text-white transition-colors">{l}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="hidden md:flex items-center gap-3 group relative cursor-pointer">
                <div className="text-[11px] font-semibold text-white">
                  {user.fullName}
                </div>
                <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center text-[#CCFF00] font-bold text-sm border border-[#444] overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                {/* Dropdown Logout */}
                <div className="absolute right-0 top-full pt-2 w-32 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="bg-[#111] border border-[#333] rounded-sm shadow-xl">
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-[#222]">Đăng xuất</button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="hidden md:block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 hover:text-white transition-colors">Đăng nhập</button>
            )}
            <Link href="/" className="bg-[#CCFF00] text-black text-[10px] font-black uppercase tracking-[0.15em] px-4 py-2 hover:bg-white transition-colors">Mua vé</Link>
            <button className="md:hidden text-gray-400" onClick={() => setOpen(o => !o)}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t border-[#222] bg-[#080808] px-6 py-4 flex flex-col gap-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            <Link href="/" onClick={() => setOpen(false)} className="text-left hover:text-white">Sự Kiện</Link>
            <Link href="/" className="hover:text-white">Nghệ Sĩ</Link>
            <Link href="/" className="hover:text-white">Địa Điểm</Link>
            <button onClick={() => { setLoginOpen(true); setOpen(false); }} className="text-left hover:text-white">Đăng nhập</button>
          </div>
        )}
      </nav>
      {loginOpen && <AuthModal onClose={() => setLoginOpen(false)} />}
    </>
  );
}
