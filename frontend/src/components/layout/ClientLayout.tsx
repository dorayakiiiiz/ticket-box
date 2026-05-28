'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isBooking = pathname.startsWith('/booking');
  const isTicket = pathname.startsWith('/ticket');

  const hideFooter = isBooking || isTicket;
  const hideNav = isTicket;

  return (
    <>
      {!hideNav && <Navbar />}
      <main className={!hideNav ? "flex-1 pt-14" : "flex-1"}>
        {children}
      </main>
      {!hideFooter && <Footer />}
    </>
  );
}
