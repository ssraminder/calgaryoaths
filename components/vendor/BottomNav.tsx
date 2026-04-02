'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarCheck, Clock, Settings } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/vendor', icon: LayoutDashboard },
  { label: 'Bookings', href: '/vendor/bookings', icon: CalendarCheck },
  { label: 'Availability', href: '/vendor/availability', icon: Clock },
  { label: 'Settings', href: '/vendor/rates', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
      <div className="flex">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === '/vendor' ? pathname === '/vendor' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-navy' : 'text-gray-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iPhones with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
