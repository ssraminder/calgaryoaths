'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash — the client library
    // picks it up automatically and sets the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h1 className="font-display font-bold text-2xl text-navy">Password updated</h1>
          <p className="text-mid-grey">Your password has been changed successfully.</p>
          <div className="flex gap-3 justify-center pt-2">
            <a href="/admin/login" className="btn-primary text-sm">Admin Login</a>
            <a href="/vendor/login" className="btn-secondary text-sm">Vendor Login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <h1 className="font-display font-bold text-2xl text-navy mb-2 text-center">Set new password</h1>
        <p className="text-mid-grey text-sm text-center mb-6">Enter your new password below.</p>

        {!ready && (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent mx-auto mb-3" />
            <p className="text-mid-grey text-sm">Verifying your reset link...</p>
          </div>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">New password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-charcoal mb-1">Confirm password</label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-btn bg-white text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
