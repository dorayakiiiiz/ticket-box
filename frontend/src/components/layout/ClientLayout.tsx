'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isBooking = pathname.startsWith('/booking');
  const isTicket = pathname.startsWith('/ticket');
  const isAdmin = pathname.startsWith('/admin'); // admin dùng layout riêng có sidebar
  const isAccountSetting = pathname.startsWith('/account-settings');
  const isConcertDetail = pathname.startsWith('/concert/');
  const hideFooter = isBooking || isTicket || isAdmin || isConcertDetail || isAccountSetting;
  const hideNav = isTicket || isAdmin;

  return (
    <>
      {!hideNav && <Navbar />}
      <main suppressHydrationWarning className={!hideNav ? "flex-1 pt-14" : "flex-1"}>
        {children}
      </main>
      {!hideFooter && <Footer />}
    </>
  );
}
