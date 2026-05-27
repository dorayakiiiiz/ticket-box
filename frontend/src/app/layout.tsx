import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["vietnamese", "latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["vietnamese", "latin"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VITICKET - Nền tảng bán vé sự kiện",
  description: "VITICKET - Hệ thống đặt vé Concert hàng đầu Việt Nam",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${plusJakartaSans.variable} ${barlowCondensed.variable}`}>
      <body className="antialiased bg-[#050505] text-white min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-14">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
