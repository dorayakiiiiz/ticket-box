import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function Footer() {
  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  return (
    <footer className="border-t border-[#222] mt-4 bg-[#050505] text-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" style={D} className="inline-flex items-center text-3xl font-black tracking-tight mb-3">
              Ticket
              <span className="relative flex items-center justify-center text-[#CCFF00] text-[40px] leading-none ml-[1px]">
                Z
                <Sparkles className="absolute -top-1 -right-3.5 w-5 h-5 text-white fill-white" />
              </span>
            </Link>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[200px]">
              Nền tảng mua vé sự kiện âm nhạc và giải trí hàng đầu Việt Nam.
            </p>
          </div>
          {[
            { title: "Sự kiện", links: ["Nhạc Pop", "Rap/Hip-Hop", "EDM", "Rock", "Comedy"] },
            { title: "Về chúng tôi", links: ["Giới thiệu", "Đối tác", "Tuyển dụng", "Blog"] },
            { title: "Hỗ trợ", links: ["Câu hỏi thường gặp", "Liên hệ", "Chính sách hoàn tiền", "Điều khoản"] }
          ].map(({ title, links }) => (
            <div key={title}>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-4">{title}</div>
              <div className="flex flex-col gap-2.5">
                {links.map(l => (
                  <Link key={l} href="/" className="text-[12px] text-gray-400 hover:text-white transition-colors">
                    {l}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#222] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-gray-500">© 2026 TicketZ. Bảo lưu mọi quyền.</p>
          <div className="flex gap-4 text-[11px] text-gray-500">
            {["Facebook", "Instagram", "TikTok", "YouTube"].map(s => (
              <a key={s} href="#" className="hover:text-white transition-colors">{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
