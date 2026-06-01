'use client';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

interface Props {
  concertId: string;
}

// BookingButton — Client Component nhỏ, chỉ cần router.push()
// Tách riêng để trang detail vẫn là Server Component (ISR)
export default function BookingButton({ concertId }: Props) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/booking/${concertId}`)}
      className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] py-4 hover:bg-white transition-colors flex items-center justify-center gap-2"
    >
      Chọn khu vực & Mua vé <ArrowRight size={14} />
    </button>
  );
}
