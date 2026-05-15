'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { LogOut, Home, Plus, ListChecks } from 'lucide-react';
import OfflineBanner from '@/components/vendor/OfflineBanner';
import TabletInstallPrompt from './TabletInstallPrompt';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LOGO_URL = 'https://ogxklbdjffbhtlabwonl.supabase.co/storage/v1/object/public/assets/calgaryoaths.png';

export default function TabletShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const isLogin = pathname === '/tablet/login';

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        if (!isLogin) router.replace('/tablet/login');
        if (!cancelled) setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('co_profiles')
        .select('full_name, role')
        .eq('id', authUser.id)
        .single();
      if (!profile || !['owner', 'admin', 'vendor'].includes(profile.role)) {
        await supabase.auth.signOut();
        router.replace('/tablet/login');
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) {
        setUser({ name: profile.full_name || authUser.email || 'Staff', role: profile.role });
        setLoading(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [pathname, router, isLogin]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/tablet/login');
  }

  if (isLogin) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  // Invoice and signed-terms pages render without tablet chrome (print-ready, customer-facing)
  if (pathname?.endsWith('/invoice') || pathname?.endsWith('/terms')) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  const onHome = pathname === '/tablet';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <OfflineBanner />
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-6">
        <Link href="/tablet" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="Calgary Oaths" className="h-9 w-auto object-contain" />
          <span className="hidden sm:block text-base font-semibold text-navy">Orders</span>
        </Link>
        <nav className="flex items-center gap-2">
          {!onHome && (
            <Link
              href="/tablet"
              className="flex h-11 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Home className="h-4 w-4" /> <span className="hidden sm:inline">Home</span>
            </Link>
          )}
          <Link
            href="/tablet/orders"
            className="flex h-11 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ListChecks className="h-4 w-4" /> <span className="hidden sm:inline">Orders</span>
          </Link>
          <Link
            href="/tablet/orders/new"
            className="flex h-11 items-center gap-1.5 rounded-md bg-navy px-3 text-sm font-medium text-white hover:bg-navy/90"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New order</span>
          </Link>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {user && (
            <div className="text-right">
              <p className="text-sm text-gray-700 truncate max-w-[160px]">{user.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex h-11 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </header>
      <main className="flex-1 px-4 py-5 md:px-6 md:py-8">{children}</main>
      <footer className="md:hidden flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2 text-xs">
        {user && <span className="text-gray-500 truncate max-w-[60%]">{user.name}</span>}
        <button onClick={logout} className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
      </footer>
      <TabletInstallPrompt />
    </div>
  );
}
