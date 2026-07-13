'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function PaymentStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'success' | 'failed' | 'processing'>('processing');
  const [orderCode, setOrderCode] = useState<string | null>(null);

  useEffect(() => {
    const vnpResponseCode = searchParams.get('vnp_ResponseCode');
    const vnpTxnRef = searchParams.get('vnp_TxnRef');
    
    const momoResultCode = searchParams.get('resultCode');
    const momoOrderId = searchParams.get('orderId');

    if (vnpResponseCode) {
      // Logic của VNPAY Sandbox: 00 là thành công
      if (vnpResponseCode === '00') {
        setStatus('success');
      } else {
        setStatus('failed');
      }
      setOrderCode(vnpTxnRef);
    } else if (momoResultCode) {
      // Logic của MoMo Sandbox: 0 là thành công
      if (momoResultCode === '0') {
        setStatus('success');
      } else {
        setStatus('failed');
      }
      setOrderCode(momoOrderId);
    } else {
      // Không có param nào hợp lệ -> Có thể bị truy cập trực tiếp
      setStatus('failed');
    }
  }, [searchParams]);

  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
        <Loader2 size={48} className="text-[#CCFF00] animate-spin mb-4" />
        <h1 style={D} className="text-2xl font-black uppercase italic mb-2 text-white">Đang xử lý kết quả...</h1>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
        <CheckCircle size={80} className="text-[#CCFF00] mb-6" />
        <h1 style={D} className="text-4xl font-black uppercase italic mb-2 text-white">Thanh toán thành công!</h1>
        <p className="text-gray-400 mb-2">Mã đơn hàng: <span className="font-mono text-white">{orderCode}</span></p>
        <p className="text-gray-500 text-sm mb-8">Vé điện tử (QR Code) đã được sinh ra và cấp vào tài khoản của bạn.</p>
        <div className="flex gap-4">
          <button onClick={() => router.push('/')} className="px-6 py-3 border border-[#333] text-white hover:border-[#CCFF00] transition-colors uppercase font-bold text-sm tracking-wider">Trang chủ</button>
          <button onClick={() => router.push('/my-tickets')} className="px-6 py-3 bg-[#CCFF00] text-black font-black uppercase tracking-wider text-sm hover:bg-white transition-colors">Xem vé của tôi</button>
        </div>
      </div>
    );
  }

  // Failed state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
      <XCircle size={80} className="text-[#FF2D20] mb-6" />
      <h1 style={D} className="text-4xl font-black uppercase italic mb-2 text-white">Thanh toán thất bại!</h1>
      <p className="text-gray-400 mb-8">Giao dịch không thành công hoặc đã bị hủy trên hệ thống thanh toán.</p>
      <div className="flex gap-4">
        <button onClick={() => router.push('/')} className="px-6 py-3 border border-[#333] text-white hover:border-[#FF2D20] transition-colors uppercase font-bold text-sm tracking-wider">Trang chủ</button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
          <Loader2 size={48} className="animate-spin text-[#CCFF00]" />
       </div>
    }>
      <PaymentStatusContent />
    </Suspense>
  );
}
