'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarCheck, Users, Settings } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
  { label: 'Vendors', href: '/admin/vendors', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
      <div className="flex px-2 pt-2 pb-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${
                active ? 'text-navy' : 'text-gray-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
