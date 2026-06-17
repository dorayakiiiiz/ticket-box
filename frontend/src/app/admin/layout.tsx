'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/authStore';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, initialize } = useAuthStore();
  const [ready, setReady] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50" suppressHydrationWarning>
        <div className="flex items-center gap-3" suppressHydrationWarning>
          <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" suppressHydrationWarning />
          <span className="text-sm text-gray-500 font-medium">Đang kiểm tra đăng nhập...</span>
        </div>
      </div>
    );
  }

  /* text-gray-900: override body's text-white so inputs/selects/textareas are visible on white bg */
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
