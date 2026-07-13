"use client";
import { useState, useEffect } from "react";
import { CheckCircle, X, EyeOff, Eye, Trash2, Edit, Phone, Mail, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../stores/authStore";
import { ticketService, MyTicketOrder } from "../../services/ticketService";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { authService } from "../../services/authService";

const D = { fontFamily: "'Barlow Condensed', sans-serif" };

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // Kiểm tra xác nhận mật khẩu mới trước khi gọi API
    if (next !== confirm) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }
    try {
      await authService.changePassword(current, next);
      setSuccess(true);
      setTimeout(onClose, 1600);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-[#333] w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[#333]">
          <h2 style={D} className="text-xl font-black uppercase italic text-white">Đổi mật khẩu</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        {success ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-[#CCFF00]/10 border border-[#CCFF00]/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-[#CCFF00]" />
            </div>
            <p style={D} className="text-2xl font-black uppercase italic text-white">Thành công!</p>
            <p className="text-xs text-gray-400 mt-2">Mật khẩu đã được cập nhật.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Hiện thị lỗi từ API */}
            {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2">{error}</p>}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">Mật khẩu hiện tại</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={current} onChange={e => setCurrent(e.target.value)} required
                  className="w-full bg-[#080808] border border-[#333] text-white text-sm px-4 pr-10 py-3 outline-none focus:border-[#CCFF00]/40 transition-colors" />
                <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">Mật khẩu mới</label>
              <div className="relative">
                <input type={showNext ? "text" : "password"} value={next} onChange={e => setNext(e.target.value)} required minLength={8}
                  className="w-full bg-[#080808] border border-[#333] text-white text-sm px-4 pr-10 py-3 outline-none focus:border-[#CCFF00]/40 transition-colors" />
                <button type="button" onClick={() => setShowNext(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">Xác nhận mật khẩu mới</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="w-full bg-[#080808] border border-[#333] text-white text-sm px-4 py-3 outline-none focus:border-[#CCFF00]/40 transition-colors" />
            </div>
            <button type="submit" className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] text-sm py-3 hover:bg-white transition-colors mt-2">
              Cập nhật mật khẩu
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function DeleteAccountModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const isValid = confirmText === "XÓA TÀI KHOẢN";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-[#FF2D20]/50 w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[#333]">
          <h2 style={D} className="text-xl font-black uppercase italic text-[#FF2D20]">Xóa tài khoản</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">
          <div className="bg-[#FF2D20]/10 border border-[#FF2D20]/20 p-4 mb-5">
            <p className="text-sm text-white font-semibold mb-1">⚠ Hành động này không thể hoàn tác</p>
            <p className="text-xs text-gray-400">Toàn bộ vé, lịch sử đặt hàng và dữ liệu cá nhân sẽ bị xóa vĩnh viễn.</p>
          </div>
          <div className="mb-5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">
              Nhập <span className="text-[#FF2D20] font-black">XÓA TÀI KHOẢN</span> để xác nhận
            </label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())}
              placeholder="XÓA TÀI KHOẢN"
              className="w-full bg-[#080808] border border-[#333] text-white text-sm px-4 py-3 outline-none focus:border-[#FF2D20]/40 transition-colors placeholder-gray-600" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-[#333] text-sm font-semibold py-3 text-gray-400 hover:text-white transition-colors">Hủy</button>
            <button onClick={isValid ? onConfirm : undefined} disabled={!isValid}
              className={`flex-1 text-sm font-black uppercase tracking-[0.12em] py-3 transition-colors ${isValid ? "bg-[#FF2D20] text-white hover:bg-red-700 cursor-pointer" : "bg-[#FF2D20]/20 text-[#FF2D20]/40 cursor-not-allowed"}`}>
              Xóa tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  const { user, logout, updateUser, isAuthenticated, initialize } = useAuthStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Auth guard — cùng pattern với /admin/layout.tsx
  useEffect(() => {
    initialize();
    setReady(true);
  }, [initialize]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace('/');
    }
  }, [ready, isAuthenticated, router]);

  const [orders, setOrders] = useState<MyTicketOrder[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTickets = async () => {
      try {
        const data = await ticketService.getMyTickets();
        if (isMounted) {
          setOrders(data);
        }
      } catch (err) { }
    };
    fetchTickets();
    return () => { isMounted = false; };
  }, []);
  let upcomingCount = 0;
  if (orders) {
    orders.forEach(order => {
      order.tickets.forEach(t => {
        if (t.status !== "USED" && t.status !== "CHECKED_IN") {
          upcomingCount++;
        }
      });
    });
  }

  const [name, setName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Sync lại khi store hydrate xong từ cookie (user thay đổi sau mount)
  useEffect(() => {
    if (user?.fullName) setName(user.fullName);
    if (user?.phone) setPhone(user.phone);
  }, [user?.fullName, user?.phone]);

  const initials = name.trim().split(" ").slice(-1)[0]?.[0]?.toUpperCase() ?? "U";

  // Gọi API lưu thông tin, cập nhật store + cookie nếu thành công
  async function handleSave() {
    setSaveError("");
    try {
      const result = await authService.updateProfile(name, phone);
      updateUser({ fullName: result.user.fullName, phone: result.user.phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Lưu thất bại. Vui lòng thử lại.");
    }
  }

  // Gọi API xoá tài khoản, sau đó clear state và redirect
  async function handleDeleteAccount() {
    try {
      await authService.deleteAccount();
    } catch (err) { }
    logout();
    router.push("/");
  }

  // Chờ hydrate store xong — hiện spinner giống admin layout
  if (!ready || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]" suppressHydrationWarning>
        <div className="flex items-center gap-3" suppressHydrationWarning>
          <div className="w-5 h-5 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin" suppressHydrationWarning />
          <span className="text-sm text-gray-400">Đang kiểm tra đăng nhập...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#080808] text-white">
        <div className="max-w-[720px] mx-auto px-6 py-12">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-px bg-[#CCFF00]" />
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Tài khoản</span>
            </div>
            <h1 style={D} className="text-5xl font-black uppercase italic tracking-tight">CÀI ĐẶT</h1>
          </div>

          {/* Profile card */}
          <div className="bg-[#111] border border-[#333] p-6 mb-3">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-20 h-20 bg-[#CCFF00] flex items-center justify-center text-black text-3xl font-black" style={D}>
                  {initials}
                </div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#0D0D0D] border border-[#333] flex items-center justify-center hover:border-[#CCFF00]/40 transition-colors">
                  <Edit size={12} className="text-gray-400" />
                </button>
              </div>
              <div>
                <div style={D} className="text-2xl font-black uppercase italic text-white leading-tight">{name}</div>
                <div className="text-xs text-gray-400 mt-1">{user?.email || "user@example.com"}</div>
                <button onClick={() => router.push("/my-tickets")}
                  className="mt-2 text-[10px] font-mono text-[#CCFF00] hover:underline">
                  {upcomingCount} vé sắp diễn →
                </button>
              </div>
            </div>
          </div>

          {/* Info form */}
          <div className="bg-[#111] border border-[#333] p-6 mb-3">
            <h2 style={D} className="text-lg font-black uppercase italic mb-5 text-white">Thông tin cá nhân</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">Họ và tên</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-[#080808] border border-[#333] text-white text-sm px-4 py-3 outline-none focus:border-[#CCFF00]/40 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">Số điện thoại</label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full bg-[#080808] border border-[#333] text-white text-sm pl-9 pr-4 py-3 outline-none focus:border-[#CCFF00]/40 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">
                  Email đăng ký <span className="normal-case font-normal tracking-normal text-[9px]">(không thể thay đổi)</span>
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input value={user?.email || "user@example.com"} readOnly
                    className="w-full bg-white/[0.02] border border-[#333] text-gray-500 text-sm pl-9 pr-10 py-3 outline-none cursor-not-allowed" />
                  <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500/40" />
                </div>
              </div>
            </div>
            <div className="mt-5">
              <button onClick={handleSave}
                className={`font-black uppercase tracking-[0.12em] text-xs px-6 py-3 transition-colors ${saved ? "bg-[#CCFF00]/20 text-[#CCFF00]" : "bg-[#CCFF00] text-black hover:bg-white"}`}>
                {saved ? "✓ Đã lưu thay đổi" : "Lưu thay đổi"}
              </button>
              {/* Hiện lỗi lưu nếu có */}
              {saveError && <p className="text-xs text-red-400 mt-2">{saveError}</p>}
            </div>
          </div>

          {/* Security — ẩn với tài khoản Google OAuth */}
          <div className="bg-[#111] border border-[#333] p-6 mb-3">
            <h2 style={D} className="text-lg font-black uppercase italic mb-5 text-white">Bảo mật</h2>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-semibold text-white">Mật khẩu</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {user?.hasPassword === false
                    ? "Tài khoản đăng nhập bằng Google — không dùng mật khẩu"
                    : "Thay đổi mật khẩu đăng nhập của bạn"}
                </div>
              </div>
              {user?.hasPassword !== false && (
                <button onClick={() => setShowPasswordModal(true)}
                  className="text-[10px] font-black uppercase tracking-[0.15em] border border-[#333] text-gray-400 px-4 py-2 hover:border-[#CCFF00]/40 hover:text-white transition-colors">
                  Đổi mật khẩu
                </button>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-[#111] border border-[#FF2D20]/30 p-6">
            <h2 style={D} className="text-lg font-black uppercase italic mb-1 text-[#FF2D20]">Vùng nguy hiểm</h2>
            <p className="text-xs text-gray-400 mb-5">Các hành động dưới đây không thể hoàn tác.</p>
            <button onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] border border-[#FF2D20]/40 text-[#FF2D20] px-4 py-2.5 hover:bg-[#FF2D20] hover:text-white transition-colors">
              <Trash2 size={12} /> Xóa tài khoản
            </button>
          </div>
        </div>

        {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
        {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} />}
      </div>
    </>
  );
}
