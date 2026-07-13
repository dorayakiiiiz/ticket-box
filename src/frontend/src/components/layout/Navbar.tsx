"use client";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Sparkles, Search, Ticket, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal from "../auth/AuthModal";
import { useAuthStore } from "../../stores/authStore";
import { authService } from "../../services/authService";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const router = useRouter();
  
  const { user, isAuthenticated, initialize, logout, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuthStore();
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearch.trim()) {
      router.push(`/search?q=${encodeURIComponent(debouncedSearch.trim())}`);
    }
  }, [debouncedSearch, router]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setOpen(false);
    }
  }

  async function handleLogout() {
    try { await authService.logout(); } catch(err) {}
    logout();
    setOpen(false);
    router.push("/");
  }

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#222] bg-[#080808]/95 backdrop-blur-sm text-white">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <Link
            href="/"
            style={D}
            className="flex items-center text-2xl font-black tracking-tight shrink-0"
          >
            Ticket
            <span className="relative flex items-center justify-center text-[#CCFF00] text-[32px] leading-none ml-[1px]">
              Z
              <Sparkles className="absolute -top-1 -right-3 w-4 h-4 text-white fill-white" />
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm concert, thành phố..."
                className="w-full h-full bg-white/[0.04] border border-[#333] border-r-0 text-white text-[12px] pl-9 pr-4 py-2 outline-none focus:border-[#CCFF00]/40 focus:bg-white/[0.06] placeholder-gray-500 transition-colors" />
            </div>
            <button type="submit" className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.1em] text-[11px] px-4 hover:bg-white transition-colors">
              Tìm
            </button>
          </form>

          <div className="flex items-center gap-3" suppressHydrationWarning>
            {mounted && isAuthenticated && user ? (
              <div className="hidden md:flex items-center gap-3 group relative cursor-pointer">
                <div className="text-[11px] md:text-sm font-semibold text-white">
                  {user.fullName}
                </div>
                <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center text-[#CCFF00] font-bold text-sm border border-[#444] overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                {/* Dropdown */}
                <div className="absolute right-0 top-full pt-2 w-52 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="bg-[#111111] border border-[#333] shadow-2xl">
                    <div className="px-4 py-3 border-b border-[#333]">
                      <div className="text-xs font-bold text-white truncate">{user.fullName}</div>
                      <div className="text-[10px] text-gray-400 truncate">{user.email}</div>
                    </div>
                    <div className="py-1">
                      {user.role === 'ORGANIZER' && (
                        <Link href="/admin"
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-[#CCFF00] hover:text-[#B8E600] hover:bg-white/5 transition-colors text-left">
                          <Sparkles size={13} /> Khu vực Ban tổ chức
                        </Link>
                      )}
                      <Link href="/my-tickets"
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left">
                        <Ticket size={13} /> Vé của tôi
                      </Link>
                      <Link href="/account-settings"
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left">
                        <Settings size={13} /> Cài đặt tài khoản
                      </Link>
                    </div>
                    <div className="border-t border-[#333] py-1">
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-[#FF2D20] hover:bg-white/5 transition-colors text-left">
                        <LogOut size={13} /> Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : mounted ? (
              <button
                onClick={openAuthModal}
                className="hidden md:block text-[11px] md:text-sm font-semibold uppercase tracking-[0.12em] text-gray-400 hover:text-white transition-colors"
              >
                Đăng nhập
              </button>
            ) : (
              <div className="hidden md:block w-16 h-4" />
            )}
            
            <button
              className="md:hidden text-gray-400"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        
        {open && (
          <div className="md:hidden border-t border-[#222] bg-[#080808] px-6 py-4 flex flex-col gap-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            <form onSubmit={handleSearch} className="flex">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm concert, thành phố..."
                  className="w-full h-full bg-white/[0.04] border border-[#333] border-r-0 text-white text-[12px] pl-9 pr-4 py-2.5 outline-none focus:border-[#CCFF00]/40 placeholder-gray-500" />
              </div>
              <button type="submit" className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.1em] text-[11px] px-4 hover:bg-white transition-colors">
                Tìm
              </button>
            </form>
            {mounted && isAuthenticated && user ? (
              <>
                {user.role === 'ORGANIZER' && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="text-left text-[#CCFF00] hover:text-[#B8E600]">Khu vực Ban tổ chức</Link>
                )}
                <Link href="/my-tickets" onClick={() => setOpen(false)} className="text-left hover:text-white">Vé của tôi</Link>
                <Link href="/account-settings" onClick={() => setOpen(false)} className="text-left hover:text-white">Cài đặt tài khoản</Link>
                <button
                  onClick={handleLogout}
                  className="text-left text-[#FF2D20]"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <button
                onClick={() => { openAuthModal(); setOpen(false); }}
                className="text-left hover:text-white"
              >
                Đăng nhập
              </button>
            )}
          </div>
        )}
      </nav>
      {isAuthModalOpen && <AuthModal onClose={closeAuthModal} />}
    </>
  );
}
