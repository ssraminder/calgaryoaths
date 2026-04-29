'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import VendorSidebar from '@/components/vendor/VendorSidebar';
import BottomNav from '@/components/vendor/BottomNav';
import OfflineBanner from '@/components/vendor/OfflineBanner';
import InstallPrompt from '@/components/vendor/InstallPrompt';
import VendorPageTransition from '@/components/vendor/VendorPageTransition';
import VendorViewportMeta from '@/components/vendor/VendorViewportMeta';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; fullName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        if (pathname !== '/vendor/login' && pathname !== '/vendor/forgot-password') router.replace('/vendor/login');
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('co_profiles')
        .select('full_name, role')
        .eq('id', authUser.id)
        .single();

      if (!profile || profile.role !== 'vendor') {
        router.replace('/vendor/login');
        setLoading(false);
        return;
      }
      setUser({ email: authUser.email || '', fullName: profile.full_name || authUser.email || '' });
      setLoading(false);
    }
    checkAuth();
  }, [pathname, router]);

  if (pathname === '/vendor/login' || pathname === '/vendor/forgot-password') return <>{children}</>;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <VendorViewportMeta />
      <OfflineBanner />
      <VendorSidebar userName={user?.fullName || ''} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="vendor-main-content flex-1 overflow-y-auto p-4 md:p-6">
          <VendorPageTransition>
            {children}
          </VendorPageTransition>
        </main>
      </div>
      <BottomNav userName={user?.fullName || ''} />
      <InstallPrompt />
    </div>
  );
}
