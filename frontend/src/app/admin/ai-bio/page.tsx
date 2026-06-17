'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, AlertTriangle, RotateCcw } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import type { Concert } from '../../../types';

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — khớp với backend MAX_PDF_SIZE
const ALLOWED_MIME = 'application/pdf';
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_COUNT = 20; // 20 × 3s = 60s max wait

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Validate file client-side trước khi gửi lên server — tránh lãng phí bandwidth */
function validateFile(file: File): string | null {
  if (file.type !== ALLOWED_MIME && !file.name.toLowerCase().endsWith('.pdf')) {
    return `File "${file.name}" không phải PDF. Chỉ chấp nhận file .pdf`;
  }
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return `File quá lớn (${sizeMB} MB). Giới hạn tối đa 10 MB`;
  }
  return null;
}

/** Extract error message từ Axios error — phân biệt 403/409/413/500 */
function extractError(err: unknown, fallback: string): string {
  const axiosErr = err as {
    response?: { data?: { message?: string }; status?: number };
    code?: string;
    message?: string;
  };
  // Network error (CORS, offline, DNS)
  if (axiosErr?.code === 'ERR_NETWORK') return 'Lỗi kết nối mạng. Kiểm tra backend đang chạy.';
  // Timeout
  if (axiosErr?.code === 'ECONNABORTED') return 'Request timeout. File có thể quá lớn hoặc mạng chậm.';
  // Backend trả lỗi cụ thể
  const status = axiosErr?.response?.status;
  const msg = axiosErr?.response?.data?.message;
  if (msg) return `[${status}] ${msg}`;
  if (status === 401) return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền thực hiện hành động này.';
  if (status === 409) return 'AI Bio đang được xử lý. Vui lòng chờ hoặc Reset status.';
  if (status === 413) return 'File quá lớn. Giới hạn tối đa 10 MB.';
  return fallback;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminAIBioPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [descriptionResult, setDescriptionResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Ref để cleanup polling khi component unmount
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Load concerts
  useEffect(() => {
    adminService.getConcerts().then(setConcerts).catch(() => {});
  }, []);

  // ─── File selection với client-side validation ─────────────────────────────
  const handleFileSelect = useCallback((selectedFile: File | null) => {
    setFileError(null);
    if (!selectedFile) {
      setFile(null);
      return;
    }
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setFileError(validationError);
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setDescriptionResult(''); // reset preview khi chọn file mới
    setError(null);
  }, []);

  // ─── Generate Bio (upload + poll) ──────────────────────────────────────────
  const handleGenerate = async () => {
    if (!file || !selectedConcertId) return;

    // Double-check validation
    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setProcessing(true);
    setError(null);
    setDescriptionResult('');
    pollCountRef.current = 0;

    try {
      await adminService.uploadBio(selectedConcertId, file);

      // Poll for result — MAX_POLL_COUNT lần, sau đó timeout
      pollRef.current = setInterval(async () => {
        pollCountRef.current += 1;

        // Fix #2: Timeout sau MAX_POLL_COUNT polls
        if (pollCountRef.current > MAX_POLL_COUNT) {
          if (pollRef.current) clearInterval(pollRef.current);
          setProcessing(false);
          setError(`Timeout sau ${MAX_POLL_COUNT * POLL_INTERVAL_MS / 1000}s. AI worker có thể đang quá tải. Thử lại sau hoặc Reset status.`);
          return;
        }

        try {
          const concert = await adminService.getConcertById(selectedConcertId);

          // Fix #3: Handle aiStatus = 'FAILED' explicitly
          if (concert.aiStatus === 'FAILED') {
            if (pollRef.current) clearInterval(pollRef.current);
            setProcessing(false);
            setError('AI xử lý thất bại. Thử upload lại hoặc kiểm tra file PDF.');
            return;
          }

          // Success
          if (concert.aiStatus === 'DONE' && concert.description) {
            if (pollRef.current) clearInterval(pollRef.current);
            setDescriptionResult(concert.description);
            setProcessing(false);
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          setProcessing(false);
          setError('Lỗi khi kiểm tra kết quả. Kiểm tra kết nối backend.');
        }
      }, POLL_INTERVAL_MS);

    } catch (err) {
      setProcessing(false);
      // Fix #6: Specific error messages
      setError(extractError(err, 'Upload thất bại. Thử lại.'));
    }
  };

  // ─── Save Bio ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedConcertId || !descriptionResult) return;
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await adminService.updateConcert(selectedConcertId, { description: descriptionResult });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(extractError(err, 'Lưu thất bại.'));
      console.error('[handleSave]', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Fix #4: Reset Bio status (khi bị kẹt PROCESSING) ─────────────────────
  const handleReset = async () => {
    if (!selectedConcertId) return;
    setIsResetting(true);
    setError(null);
    try {
      await adminService.resetBio(selectedConcertId);
      setProcessing(false);
      setDescriptionResult('');
      setFile(null);
      // Refresh concert list
      const data = await adminService.getConcerts();
      setConcerts(data);
    } catch (err) {
      setError(extractError(err, 'Reset thất bại.'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Tạo Mô Tả Bằng AI</h1>
        <p className="text-gray-600">Tự động tóm tắt tài liệu sự kiện và nối vào mô tả</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ─── Left Column: Upload + Concert Select ─── */}
        <div>
          {/* Upload Section */}
          <div className="bg-white border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tải lên Press Kit</h3>

            {!file ? (
              /* Empty state — dotted upload zone */
              <div className="border-2 border-dashed border-gray-300 p-8 text-center mb-4">
                <Brain size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-4">Tải lên file PDF Press Kit hoặc Artist Profile</p>
                <label className="bg-gray-900 text-white font-bold text-sm px-6 py-3 hover:bg-gray-800 transition-colors cursor-pointer inline-block">
                  Chọn PDF
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => handleFileSelect(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            ) : (
              /* File selected — info + re-upload */
              <div className="border border-gray-200 p-5 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-gray-500 uppercase">PDF</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(file.size / 1024).toFixed(0)} KB · PDF
                    </p>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-green-600" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <label className={`w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-bold text-sm px-4 py-2.5 transition-colors ${
                  processing
                    ? 'opacity-40 cursor-not-allowed pointer-events-none bg-gray-50'
                    : 'hover:bg-gray-50 cursor-pointer bg-white'
                }`}>
                  <RotateCcw size={14} />
                  Upload lại
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    disabled={processing}
                    onChange={e => handleFileSelect(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            )}

            {/* Fix #1: Client-side file validation error */}
            {fileError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-4 py-3 mb-4">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">{fileError}</p>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Chỉ chấp nhận file PDF, tối đa 10 MB.
              Hệ thống sẽ tự động trích xuất và tóm tắt bằng AI.
            </p>
          </div>

          {/* Concert Selection */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Chọn concert</h3>
            {/* Fix #7: Disable select khi đang processing */}
            <select
              value={selectedConcertId}
              onChange={e => setSelectedConcertId(e.target.value)}
              disabled={processing}
              className={`w-full px-4 py-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-400 mb-4 ${
                processing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Chọn concert...</option>
              {concerts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={processing || !file || !selectedConcertId || !!fileError}
              className="w-full bg-[#CCFF00] text-black font-bold text-sm px-6 py-3 hover:bg-[#B8E600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {processing ? 'Đang xử lý...' : 'Tạo Mô Tả AI'}
            </button>

            {/* Fix #4: Reset button — hiện khi có error hoặc processing stuck */}
            {selectedConcertId && (error || processing) && (
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold text-sm px-4 py-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={14} className={isResetting ? 'animate-spin' : ''} />
                {isResetting ? 'Đang reset...' : 'Reset AI Status'}
              </button>
            )}

            {/* Error display */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-4 py-3 mt-3">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Column: Preview ─── */}
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Preview</h3>
          {processing ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-gray-600 mb-1">Đang phân tích PDF và tạo nội dung...</p>
                <p className="text-xs text-gray-400">
                  Polling {pollCountRef.current}/{MAX_POLL_COUNT}
                </p>
              </div>
            </div>
          ) : descriptionResult ? (
            <div>
              <textarea
                value={descriptionResult}
                onChange={e => setDescriptionResult(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-400 resize-none mb-4"
              />
              {saveSuccess && (
                <div className="mb-3 bg-green-50 border border-green-200 px-4 py-3 text-sm font-semibold text-green-700">
                  ✓ Đã lưu mô tả thành công!
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-gray-900 text-white font-bold text-sm px-6 py-3 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu Mô Tả'}
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="mb-4">AI sẽ tạo ra đoạn mô tả ngắn gọn về sự kiện/nghệ sĩ dựa trên thông tin từ Press Kit và nối vào mô tả hiện tại.</p>
              <p className="italic text-gray-500">Kết quả sẽ hiển thị ở đây sau khi xử lý...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
