'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Supabase client tự động bắt hash fragment và tạo session
        const { data: { session }, error: sbError } = await supabase.auth.getSession();

        if (sbError || !session) {
          throw new Error(sbError?.message || 'Không tìm thấy phiên đăng nhập Supabase');
        }

        // Gửi access_token của Supabase lên Backend để đổi lấy JWT của hệ thống
        const data = await authService.googleLogin(session.access_token);

        // Lưu vào Zustand
        useAuthStore.getState().login(data.user);

        // Chuyển hướng về trang chủ
        router.push('/');
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Xác thực Google thất bại');
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
      {error ? (
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-500 mb-4">Đăng nhập thất bại</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="px-6 py-2 bg-[#CCFF00] text-black font-bold uppercase tracking-widest text-xs">
            Về Trang Chủ
          </button>
        </div>
      ) : (
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm uppercase tracking-widest">Đang xử lý đăng nhập...</p>
        </div>
      )}
    </div>
  );
}
