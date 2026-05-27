'use client';
import { useState } from 'react';
import { X, User, Mail, EyeOff, Eye } from 'lucide-react';

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPw, setShowPw] = useState(false);
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-[#333] w-full max-w-md text-white">
        <div className="flex items-center justify-between p-5 border-b border-[#333]">
          <div style={D} className="text-xl font-black uppercase tracking-wide"><span className="text-[#CCFF00]">VI</span>TICKET</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex border-b border-[#333]">
          {(["login", "register"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-colors ${tab === t ? "text-[#CCFF00] border-b-2 border-[#CCFF00]" : "text-gray-400 hover:text-white"}`}>
              {t === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>
        <div className="p-5 flex flex-col gap-4">
          {tab === "register" && (
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="Họ và tên" className="w-full bg-[#111] border border-[#333] text-white text-sm pl-9 pr-3 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-gray-500" />
            </div>
          )}
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" placeholder="Email của bạn" className="w-full bg-[#111] border border-[#333] text-white text-sm pl-9 pr-3 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-gray-500" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">••</span>
            <input type={showPw ? "text" : "password"} placeholder="Mật khẩu" className="w-full bg-[#111] border border-[#333] text-white text-sm pl-9 pr-10 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-gray-500" />
            <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {tab === "login" && <div className="text-right"><a href="#" className="text-[11px] text-[#CCFF00] hover:underline">Quên mật khẩu?</a></div>}
          <button className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.15em] text-sm py-3 hover:bg-white transition-colors">
            {tab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#333]" /><span className="text-[10px] text-gray-400 uppercase tracking-widest">Hoặc</span><div className="flex-1 h-px bg-[#333]" />
          </div>
          <button className="border border-[#333] text-sm py-3 flex items-center justify-center gap-3 text-white hover:border-[#CCFF00]/30 transition-colors bg-transparent">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Tiếp tục với Google
          </button>
        </div>
      </div>
    </div>
  );
}
