'use client';
import { useState } from 'react';
import { QrCode, CheckCircle } from 'lucide-react';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

export default function AdminCheckinPage() {
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Soát vé</h1>
        <p className="text-gray-600">Quét QR code để check-in khách hàng</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scanner — Figma exact */}
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quét mã QR</h3>
          <div className="bg-gray-100 rounded-sm p-12 text-center mb-4">
            <QrCode size={96} className="mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-6">
              {scanning ? 'Đang quét...' : 'Click để bắt đầu quét QR code'}
            </p>
            <button
              onClick={() => {
                setScanning(true);
                setTimeout(() => {
                  setScanning(false);
                  setLastScan('VT-' + Math.random().toString(36).substring(2, 8).toUpperCase());
                }, 1500);
              }}
              className={`${
                scanning ? 'bg-gray-400' : 'bg-gray-900'
              } text-white font-bold text-sm px-8 py-3 rounded-sm hover:bg-gray-800 transition-colors`}
            >
              {scanning ? 'Đang quét...' : 'Bắt đầu quét'}
            </button>
          </div>
          {lastScan && (
            <div className="bg-green-50 border border-green-200 rounded-sm p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-600" />
              <div>
                <p className="text-sm font-bold text-green-900">Check-in thành công!</p>
                <p className="text-xs text-green-700">Vé số: {lastScan}</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats — Figma exact */}
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Đã check-in</p>
              <p style={D} className="text-3xl font-black text-green-600">847</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Chưa check-in</p>
              <p style={D} className="text-3xl font-black text-gray-900">12,000</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Check-in gần đây</h3>
            <div className="space-y-3">
              {['VT-A1B2C3', 'VT-D4E5F6', 'VT-G7H8I9'].map((ticket, i) => (
                <div key={ticket} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-mono font-semibold text-gray-900">{ticket}</p>
                    <p className="text-xs text-gray-500">{i + 1} phút trước</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-sm bg-green-100 text-green-700">✓</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
