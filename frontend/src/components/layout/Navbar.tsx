'use client';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import LoginModal from '../auth/LoginModal';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#222] bg-[#080808]/95 backdrop-blur-sm text-white">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" style={D} className="text-2xl font-black tracking-tight">
            <span className="text-[#CCFF00]">VI</span>TICKET
          </Link>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            {["Sự Kiện", "Nghệ Sĩ", "Địa Điểm", "Khuyến Mãi"].map(l => (
              <Link key={l} href="/" className="hover:text-white transition-colors">{l}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLoginOpen(true)} className="hidden md:block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 hover:text-white transition-colors">Đăng nhập</button>
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
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </>
  );
}
