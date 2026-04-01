'use client';

import { useEffect } from 'react';

/**
 * Detects Supabase auth callbacks in the URL hash (e.g. password recovery)
 * and redirects to the appropriate page.
 * Must be included in the root layout so it runs on every page.
 */
export default function AuthRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Redirect to reset-password page, preserving the hash for Supabase client
      window.location.replace(`/reset-password${hash}`);
    }
  }, []);

  return null;
}
