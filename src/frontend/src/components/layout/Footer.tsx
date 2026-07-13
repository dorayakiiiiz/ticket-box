import Link from 'next/link';
import { Sparkles, Heart } from 'lucide-react';

export default function Footer() {
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  return (
    <footer className="border-t border-[#222] bg-[#050505] text-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" style={D} className="inline-flex items-center text-3xl font-black tracking-tight mb-3">
              Ticket
              <span className="relative flex items-center justify-center text-[#CCFF00] text-[40px] leading-none ml-[1px]">
                Z
                <Sparkles className="absolute -top-1 -right-3.5 w-5 h-5 text-white fill-white" />
              </span>
            </Link>
            <p className="text-[12px] md:text-sm text-gray-500 leading-relaxed max-w-[200px]">
              Nền tảng mua vé sự kiện âm nhạc và giải trí hàng đầu Việt Nam.
            </p>
          </div>
          <div className="col-span-2 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <div className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-gray-500 mb-4">ĐỒ ÁN MÔN HỌC</div>
              <div className="flex flex-col gap-2.5">
                <div className="text-[12px] md:text-sm text-gray-400">Môn học: System Design</div>
                <div className="text-[12px] md:text-sm text-gray-400">Khoa Công nghệ thông tin</div>
                <div className="text-[12px] md:text-sm text-gray-400">Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM</div>
              </div>
            </div>
            <div>
              <div className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-gray-500 mb-4">TẦM NHÌN</div>
              <div className="flex flex-col gap-2.5">
                <div className="text-[12px] md:text-sm text-gray-400">Nâng tầm trải nghiệm đặt vé với tiêu chuẩn bảo mật và minh bạch tuyệt đối.</div>
                <div className="text-[12px] md:text-sm text-gray-400">Hạ tầng mạnh mẽ, vận hành mượt mà ngay cả ở những phút cao điểm nhất.</div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-[#222] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] md:text-xs text-gray-500">© 2026 TicketZ. Bảo lưu mọi quyền.</p>
          {/* <div className="flex gap-4 text-[11px] md:text-xs text-gray-500">
            {["Facebook", "Instagram", "TikTok", "YouTube"].map(s => (
              <a key={s} href="#" className="hover:text-white transition-colors">{s}</a>
            ))}
          </div> */}
          <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-[#CCFF00]">
            From HCMUS with love <Heart size={14} className="text-red-500 fill-red-500" />
          </div>
        </div>
      </div>
    </footer>
  );
}
