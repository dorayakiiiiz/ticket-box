'use client';
import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { adminService, fetcher } from '../../services/adminService';
import type { AiBioStatus } from '../../types';

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

type Props = {
  concertId: string;
  initialStatus: AiBioStatus;
  onStatusChange?: () => void;
};

export default function UploadPdfButton({ concertId, initialStatus, onStatusChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(initialStatus === 'PROCESSING');

  // Poll GET /concerts/:id chỉ khi đang PROCESSING
  const { data } = useSWR(
    pollingActive ? `/concerts/${concertId}` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  const currentStatus: AiBioStatus = data?.aiBioStatus ?? initialStatus;

  // Dừng poll khi job hoàn thành, thông báo parent refresh
  useEffect(() => {
    if ((currentStatus === 'DONE' || currentStatus === 'FAILED') && pollingActive) {
      setPollingActive(false);
      onStatusChange?.();
    }
  }, [currentStatus]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    const hasValidExt = file.name.toLowerCase().endsWith('.pdf');
    const hasValidType = !file.type || file.type === 'application/pdf';
    if (!hasValidExt || !hasValidType) {
      setUploadError('Chỉ chấp nhận file PDF');
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      setUploadError('File không được vượt quá 10MB');
      return;
    }

    setIsUploading(true);
    try {
      await adminService.uploadBio(concertId, file);
      setPollingActive(true); // Bắt đầu poll sau khi upload thành công
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setUploadError(msg ?? 'Upload thất bại, thử lại sau');
    } finally {
      setIsUploading(false);
      // Reset input để có thể chọn lại cùng file
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    try {
      await adminService.resetBio(concertId);
      setPollingActive(false);
      window.location.reload();
    } catch {
      setUploadError('Reset thất bại');
    }
  };

  // PROCESSING state
  if (currentStatus === 'PROCESSING' || isUploading) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-amber-600">
        <Loader2 size={13} className="animate-spin" />
        <span>Đang xử lý AI...</span>
        {!isUploading && (
          <button onClick={handleReset} className="text-[11px] text-slate-400 hover:text-red-500 underline ml-1 transition-colors">
            Reset
          </button>
        )}
      </div>
    );
  }

  // DONE state
  if (currentStatus === 'DONE') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <CheckCircle size={13} />
          <span>AI Bio hoàn tất</span>
        </div>
        {/* Cho phép upload lại */}
        <button
          onClick={() => inputRef.current?.click()}
          className="text-[11px] font-medium text-slate-400 hover:text-indigo-600 underline ml-1 transition-colors"
          aria-label="Upload lại file PDF"
        >
          Upload lại
        </button>
        <input ref={inputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" aria-hidden="true" />
      </div>
    );
  }

  // FAILED state
  if (currentStatus === 'FAILED') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
          <XCircle size={13} />
          <span>Lỗi xử lý AI</span>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-[11px] font-medium text-slate-400 hover:text-indigo-600 underline ml-1 transition-colors"
          aria-label="Thử upload lại file PDF"
        >
          Thử lại
        </button>
        <input ref={inputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" aria-hidden="true" />
        {uploadError && <span className="text-[11px] text-red-500 ml-1">{uploadError}</span>}
      </div>
    );
  }

  // IDLE state — nút upload mặc định
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors"
        aria-label="Upload file PDF để tạo AI Bio"
      >
        <Upload size={13} />
        <span>Upload PDF</span>
      </button>
      {uploadError && (
        <span role="alert" className="text-[11px] text-red-500">{uploadError}</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
