'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/authStore';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, initialize } = useAuthStore();
  const [ready, setReady] = useState(false);

  // Gọi initialize() để đọc token từ cookie trước khi check auth
  useEffect(() => {
    initialize();
    setReady(true);
  }, [initialize]);

  useEffect(() => {
    if (ready && !token) {
      router.replace('/');
    }
  }, [ready, token, router]);

  if (!ready || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" suppressHydrationWarning>
        <div className="flex items-center gap-3" suppressHydrationWarning>
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" suppressHydrationWarning />
          <span className="text-sm text-slate-500 font-medium">Đang kiểm tra đăng nhập...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
