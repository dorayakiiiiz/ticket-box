'use client';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

// BackButton — Client Component nhỏ, chỉ cần router.back()
// Tách riêng để không "use client" cả trang detail
export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="absolute top-6 left-6 flex items-center gap-2 text-[11px] md:text-xs font-semibold text-white/60 hover:text-white uppercase tracking-widest transition-colors"
    >
      <ChevronLeft size={14} /> Trở về
    </button>
  );
}
