'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Sidebar from '@/components/admin/Sidebar';
import TopBar from '@/components/admin/TopBar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; fullName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        if (pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('co_profiles')
        .select('full_name, role')
        .eq('id', authUser.id)
        .single();

      setUser({
        email: authUser.email || '',
        fullName: profile?.full_name || authUser.email || '',
      });
      setLoading(false);
    }
    checkAuth();
  }, [pathname, router]);

  // Login page renders without admin chrome
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userName={user?.fullName || ''} portalName="Calgary Oaths Admin" />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
