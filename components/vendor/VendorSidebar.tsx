'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarCheck, Clock, Calendar, DollarSign } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/vendor', icon: LayoutDashboard },
  { label: 'Bookings', href: '/vendor/bookings', icon: CalendarCheck },
  { label: 'Rates', href: '/vendor/rates', icon: DollarSign },
  { label: 'Availability', href: '/vendor/availability', icon: Clock },
  { label: 'Calendar', href: '/vendor/calendar', icon: Calendar },
];

export default function VendorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <Link href="/vendor" className="text-lg font-semibold text-navy">
          Partner Portal
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
      <div className="border-t border-gray-200 px-4 py-3">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">&larr; Back to site</Link>
      </div>
    </aside>
  );
}
