'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavItems, isAdminNavActive } from '@/components/admin/nav-items';

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
        {adminNavItems.map(({ label, href, icon: Icon }) => {
          const active = isAdminNavActive(pathname, href);

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
