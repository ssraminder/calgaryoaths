'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardCheck,
  Users,
  Wrench,
  MapPin,
  BarChart3,
  Settings,
  FileText,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
  { label: 'Orders', href: '/admin/orders', icon: FileText },
  { label: 'Reviews', href: '/admin/reviews', icon: ClipboardCheck },
  { label: 'Vendors', href: '/admin/vendors', icon: Users },
  { label: 'Services', href: '/admin/services', icon: Wrench },
  { label: 'Locations', href: '/admin/locations', icon: MapPin },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <Link href="/admin" className="text-lg font-semibold text-navy">
          Calgary Oaths
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active =
            href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-navy/10 text-navy'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 px-4 py-3">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">
          &larr; Back to site
        </Link>
      </div>
    </aside>
  );
}
