'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { LogOut, Bell } from 'lucide-react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LOGO_URL = 'https://ogxklbdjffbhtlabwonl.supabase.co/storage/v1/object/public/assets/calgaryoaths.png';

export default function TopBar({
  userName,
  logoutRedirect,
  portalName,
  homeHref,
}: {
  userName: string;
  logoutRedirect?: string;
  portalName?: string;
  homeHref?: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace(logoutRedirect || '/admin/login');
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      {/* Mobile: logo + portal name (sidebar hidden on mobile) */}
      <Link href={homeHref || '/admin'} className="flex items-center gap-2 md:hidden">
        <Image
          src={LOGO_URL}
          alt="Calgary Oaths"
          width={100}
          height={34}
          className="h-8 w-auto object-contain"
        />
      </Link>
      {/* Desktop: empty spacer (sidebar shows brand) */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-2 md:gap-4">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="hidden h-6 w-px bg-gray-200 sm:block" />
        <span className="hidden text-sm text-gray-600 sm:block truncate max-w-[160px]">{userName}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 min-h-[44px]"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
