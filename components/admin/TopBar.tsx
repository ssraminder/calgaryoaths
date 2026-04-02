'use client';

import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { LogOut } from 'lucide-react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TopBar({ userName, logoutRedirect }: { userName: string; logoutRedirect?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace(logoutRedirect || '/admin/login');
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="md:hidden">
        <span className="text-sm font-semibold text-navy">Partner Portal</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3 md:gap-4">
        <span className="text-sm text-gray-600 truncate max-w-[120px] md:max-w-none">{userName}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 min-h-[44px]"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
