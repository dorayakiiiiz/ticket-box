'use client';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  concertId: string;
  openTime?: string;
}

// BookingButton — Client Component nhỏ, chỉ cần router.push()
export default function BookingButton({ concertId, openTime }: Props) {
  const router = useRouter();
  const { isAuthenticated, openAuthModal } = useAuthStore();

  const isNotOpen = openTime && new Date() < new Date(openTime);

  const handleBookingClick = () => {
    if (isNotOpen) return;
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    router.push(`/booking/${concertId}`);
  };

  if (isNotOpen) {
    const formattedTime = new Date(openTime).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    return (
      <div className="w-full bg-[#1a1a1a] border border-[#333] text-gray-400 font-bold tracking-[0.12em] py-4 flex flex-col items-center justify-center gap-1">
        <span className="text-[10px] uppercase">Vé mở bán từ</span>
        <span className="text-sm text-white">{formattedTime}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleBookingClick}
      className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] py-4 hover:bg-white transition-colors flex items-center justify-center gap-2"
    >
      Chọn khu vực & Mua vé <ArrowRight size={14} />
    </button>
  );
}
