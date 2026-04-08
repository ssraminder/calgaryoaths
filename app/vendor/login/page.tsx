'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function VendorLoginPage() {
  return (
    <Suspense>
      <VendorLoginForm />
    </Suspense>
  );
}

function VendorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // OTP state
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.logoUrl) setLogoUrl(data.logoUrl); })
      .catch(() => {});
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const redirect = useCallback(() => {
    const next = searchParams.get('next') || '/vendor';
    window.location.href = next;
  }, [searchParams]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }

    redirect();
  }

  async function handleOtpSend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/vendor/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send code');
        setLoading(false);
        return;
      }

      setOtpStep('code');
      setResendCooldown(60);
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/vendor/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed');
        setLoading(false);
        return;
      }

      // Exchange token_hash for a real session
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });

      if (verifyErr) {
        setError(verifyErr.message);
        setLoading(false);
        return;
      }

      redirect();
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/vendor/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to resend code');
      } else {
        setResendCooldown(60);
        setOtpCode('');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  function switchMode() {
    setMode((m) => m === 'password' ? 'otp' : 'password');
    setError('');
    setOtpStep('email');
    setOtpCode('');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {logoUrl && (
          <div className="mb-6 flex justify-center">
            <Image src={logoUrl} alt="Calgary Oaths" width={160} height={54} className="h-12 w-auto object-contain" />
          </div>
        )}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-gray-900">Partner Login</h1>
          <p className="mb-6 text-sm text-gray-500">Calgary Oaths Partner Portal</p>

          {mode === 'password' ? (
            <>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy" />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                  <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy" />
                </div>
                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              <p className="mt-4 text-center text-sm text-gray-500">
                <a href="/vendor/forgot-password" className="text-navy hover:underline">Forgot password?</a>
              </p>
            </>
          ) : otpStep === 'email' ? (
            <form onSubmit={handleOtpSend} className="space-y-4">
              <div>
                <label htmlFor="otp-email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input id="otp-email" type="email" required value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy" />
              </div>
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
                {loading ? 'Sending...' : 'Send login code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <p className="text-sm text-gray-500">
                We sent a 6-digit code to <span className="font-medium text-gray-700">{otpEmail}</span>
              </p>
              <div>
                <label htmlFor="otp-code" className="mb-1 block text-sm font-medium text-gray-700">Login code</label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-center tracking-[0.3em] font-mono focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading || otpCode.length !== 6}
                className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <p className="text-center text-sm text-gray-500">
                {resendCooldown > 0 ? (
                  <span>Resend code in {resendCooldown}s</span>
                ) : (
                  <button type="button" onClick={handleResend} disabled={loading} className="text-navy hover:underline">
                    Resend code
                  </button>
                )}
                {' · '}
                <button type="button" onClick={() => { setOtpStep('email'); setOtpCode(''); setError(''); }} className="text-navy hover:underline">
                  Change email
                </button>
              </p>
            </form>
          )}

          <div className="mt-4 border-t border-gray-100 pt-4 text-center">
            <button type="button" onClick={switchMode} className="text-sm text-gray-500 hover:text-navy">
              {mode === 'password' ? 'Sign in with email code' : 'Sign in with password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
