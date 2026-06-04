'use client';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  concertId: string;
}

// BookingButton — Client Component nhỏ, chỉ cần router.push()
export default function BookingButton({ concertId }: Props) {
  const router = useRouter();
  const { isAuthenticated, openAuthModal } = useAuthStore();

  const handleBookingClick = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    router.push(`/booking/${concertId}`);
  };

  return (
    <button
      onClick={handleBookingClick}
      className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] py-4 hover:bg-white transition-colors flex items-center justify-center gap-2"
    >
      Chọn khu vực & Mua vé <ArrowRight size={14} />
    </button>
  );
}
