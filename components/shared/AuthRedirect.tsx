'use client';

import { useEffect } from 'react';

/**
 * Detects Supabase auth callbacks in the URL (hash or query params)
 * and redirects to the appropriate page.
 * Must be included in the root layout so it runs on every page.
 */
export default function AuthRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const pathname = window.location.pathname;

    // Legacy hash-based recovery flow
    if (hash && hash.includes('type=recovery')) {
      window.location.replace(`/reset-password${hash}`);
      return;
    }

    // PKCE code-based flow — redirect through callback unless already there
    if (code && pathname !== '/auth/callback' && pathname !== '/reset-password') {
      window.location.replace(`/auth/callback?code=${code}&next=/reset-password`);
    }
  }, []);

  return null;
}
