'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { LayoutDashboard, CalendarCheck, Clock, Calendar, DollarSign, Settings, LogOut, FileText } from 'lucide-react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const navItems = [
  { label: 'Dashboard', href: '/vendor', icon: LayoutDashboard },
  { label: 'Bookings', href: '/vendor/bookings', icon: CalendarCheck },
  { label: 'Orders', href: '/vendor/orders', icon: FileText },
  { label: 'Earnings', href: '/vendor/earnings', icon: DollarSign },
  { label: 'Availability', href: '/vendor/availability', icon: Clock },
  { label: 'Calendar', href: '/vendor/calendar', icon: Calendar },
  { label: 'Settings', href: '/vendor/rates', icon: Settings },
];

export default function VendorSidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.logoUrl) setLogoUrl(data.logoUrl); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/vendor/login');
  }

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <Link href="/vendor">
          {logoUrl
            ? <Image src={logoUrl} alt="Calgary Oaths" width={130} height={44} className="h-8 w-auto object-contain" />
            : <span className="text-lg font-semibold text-navy">Partner Portal</span>
          }
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === '/vendor' ? pathname === '/vendor' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-navy/10 text-navy' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 px-3 py-3">
        {userName && (
          <div className="px-2 pb-2 text-xs text-gray-500 truncate">{userName}</div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
        <Link href="/" className="mt-2 block px-2 text-xs text-gray-400 hover:text-gray-600">&larr; Back to site</Link>
      </div>
    </aside>
  );
}
