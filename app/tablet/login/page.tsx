'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TabletLoginPage() {
  return (
    <Suspense>
      <TabletLoginForm />
    </Suspense>
  );
}

function TabletLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.logoUrl) setLogoUrl(data.logoUrl); })
      .catch(() => {});
  }, []);

  const redirect = useCallback(() => {
    const next = searchParams.get('next') || '/tablet';
    window.location.href = next;
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }

    // Verify role server-side via profile
    if (data.user) {
      const { data: profile } = await supabase
        .from('co_profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      if (!profile || !['owner', 'admin', 'vendor'].includes(profile.role)) {
        await supabase.auth.signOut();
        setError('This account does not have access to the tablet.');
        setLoading(false);
        return;
      }
    }

    redirect();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        {logoUrl && (
          <div className="mb-6 flex justify-center">
            <Image src={logoUrl} alt="Calgary Oaths" width={180} height={60} className="h-14 w-auto object-contain" />
          </div>
        )}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-semibold text-gray-900">Tablet sign-in</h1>
          <p className="mb-6 text-sm text-gray-500">Calgary Oaths Orders</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-base focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-base focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-navy px-4 py-3 text-base font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            <a href="/vendor/forgot-password" className="text-navy hover:underline">Forgot password?</a>
          </p>
        </div>
      </div>
    </div>
  );
}
