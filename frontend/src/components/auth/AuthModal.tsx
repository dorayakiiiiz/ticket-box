'use client';
import { useState, useRef } from 'react';
import { X, User, Mail, EyeOff, Eye, Loader2, Sparkles } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { createClient } from '@supabase/supabase-js';
import { Turnstile } from '@marsidev/react-turnstile';

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState<"form" | "otp" | "otp-reset">("form"); // For register and reset flows
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const D = { fontFamily: "'Barlow Condensed', sans-serif" };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const data = await authService.login(email, password);
        useAuthStore.getState().login(data.user, data.token);
        onClose();
      } else if (tab === 'register') {
        if (step === 'form') {
          if (!captchaToken) {
            setError('Vui lòng xác minh Captcha trước khi tiếp tục');
            setLoading(false);
            return;
          }
          await authService.signup(email, password, fullName, captchaToken);
          setStep('otp');
        } else {
          const code = otp.join('');
          if (code.length < 6) {
            setError('Vui lòng nhập đủ 6 số OTP');
            setLoading(false);
            return;
          }
          const data = await authService.verifyOtp(email, code);
          useAuthStore.getState().login(data.user, data.token);
          onClose();
        }
      } else if (tab === 'forgot') {
        if (step === 'form') {
          if (!captchaToken) {
            setError('Vui lòng xác minh Captcha trước khi tiếp tục');
            setLoading(false);
            return;
          }
          await authService.forgotPassword(email, captchaToken);
          setStep('otp-reset');
        } else if (step === 'otp-reset') {
          const code = otp.join('');
          if (code.length < 6) {
            setError('Vui lòng nhập đủ 6 số OTP');
            setLoading(false);
            return;
          }
          if (password.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự');
            setLoading(false);
            return;
          }
          await authService.resetPassword(email, code, password);
          // Success! Switch to login tab
          setTab('login');
          setStep('form');
          setPassword('');
          setError('Khôi phục mật khẩu thành công. Vui lòng đăng nhập lại.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback'
        }
      });
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi gọi Google Auth');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-[#333] w-full max-w-md text-white">
        <div className="flex items-center justify-between p-5 border-b border-[#333]">
          <div style={D} className="flex items-center text-2xl font-black tracking-tight">
            Ticket
            <span className="relative flex items-center justify-center text-[#CCFF00] text-[32px] leading-none ml-[1px]">
              Z
              <Sparkles className="absolute -top-1 -right-3 w-4 h-4 text-white fill-white" />
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        {step === 'form' && tab !== 'forgot' && (
          <div className="flex border-b border-[#333]">
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-3 text-[11px] md:text-[13px] font-black uppercase tracking-[0.15em] transition-colors ${tab === t ? "text-[#CCFF00] border-b-2 border-[#CCFF00]" : "text-gray-400 hover:text-white"}`}>
                {t === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>
        )}

        {tab === 'forgot' && step === 'form' && (
          <div className="flex border-b border-[#333] px-5 py-4 items-center gap-3">
            <button onClick={() => { setTab('login'); setError(''); }} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
            <h3 className="font-black uppercase tracking-[0.15em] text-[#CCFF00] text-sm">Quên mật khẩu</h3>
          </div>
        )}

        <div className="p-5 flex flex-col gap-4">
          {error && <div className="text-red-500 text-xs bg-red-500/10 p-3 border border-red-500/20">{error}</div>}

          {step === 'form' ? (
            <>
              {tab === "register" && (
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Họ và tên" className="w-full bg-[#111] border border-[#333] text-white text-sm pl-9 pr-3 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-gray-500" />
                </div>
              )}
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email của bạn" className="w-full bg-[#111] border border-[#333] text-white text-sm pl-9 pr-3 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-gray-500" />
              </div>
              {tab !== "forgot" && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">••</span>
                  <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="Mật khẩu" className="w-full bg-[#111] border border-[#333] text-white text-sm pl-9 pr-10 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-gray-500" />
                  <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              )}
              {tab === "login" && (
                <div className="text-right">
                  <button onClick={() => { setTab('forgot'); setError(''); }} className="text-[11px] md:text-xs text-[#CCFF00] hover:underline">Quên mật khẩu?</button>
                </div>
              )}

              {/* CLOUDFLARE TURNSTILE CAPTCHA */}
              {(tab === "register" || tab === "forgot") && (
                <div className="flex justify-center mt-2">
                  <Turnstile 
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} 
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setError('Captcha bị lỗi, vui lòng thử lại')}
                    options={{ theme: 'dark' }}
                  />
                </div>
              )}

              <button disabled={loading} onClick={handleSubmit} className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.15em] text-sm py-3 hover:bg-white transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {tab === "login" ? "Đăng nhập" : "Tiếp tục"}
              </button>

              {tab !== 'forgot' && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#333]" /><span className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest">Hoặc</span><div className="flex-1 h-px bg-[#333]" />
                  </div>

                  <button onClick={handleGoogleLogin} className="border border-[#333] text-sm py-3 flex items-center justify-center gap-3 text-white hover:border-[#CCFF00]/30 transition-colors bg-transparent">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Tiếp tục với Google
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="text-center">
                <h3 className="text-lg font-bold">Xác thực Email</h3>
                <p className="text-sm text-gray-400 mt-2">Mã OTP đã được gửi đến <span className="text-[#CCFF00]">{email}</span></p>
              </div>

              <div className="flex gap-2 justify-center w-full">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center bg-[#111] border border-[#333] text-white text-lg font-bold outline-none focus:border-[#CCFF00]/50"
                  />
                ))}
              </div>

              {step === 'otp-reset' && (
                <div className="relative w-full mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">••</span>
                  <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="Nhập mật khẩu mới" className="w-full bg-[#111] border border-[#333] text-white text-sm pl-9 pr-10 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-gray-500" />
                  <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              )}

              <button disabled={loading} onClick={handleSubmit} className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.15em] text-sm py-3 hover:bg-white transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                Xác nhận
              </button>

              <button onClick={() => setStep('form')} className="text-xs text-gray-400 hover:text-white uppercase tracking-widest">
                Quay lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
