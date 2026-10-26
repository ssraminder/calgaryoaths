'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal, X, ChevronRight } from 'lucide-react';
import { adminNavItems, isAdminNavActive } from '@/components/admin/nav-items';

const primaryItems = adminNavItems.filter((i) => i.primaryMobile);
const moreItems = adminNavItems.filter((i) => !i.primaryMobile);

export default function AdminBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreItems.some((i) => isAdminNavActive(pathname, i.href));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 pb-8 shadow-xl animate-slide-up"
            role="dialog"
            aria-label="More"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">More</h3>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="divide-y divide-gray-100 rounded-xl border border-gray-200" aria-label="More pages">
              {moreItems.map(({ label, href, icon: Icon }) => {
                const active = isAdminNavActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex min-h-[48px] items-center gap-3 px-4 py-3 text-sm font-medium active:bg-gray-50 ${
                      active ? 'text-navy' : 'text-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-gray-500" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
        <div className="flex items-center justify-around px-2 pt-2.5 pb-2">
          {primaryItems.map(({ label, href, icon: Icon }) => {
            const active = isAdminNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1 text-[10px] font-medium transition-colors ${
                  active ? 'text-navy' : 'text-gray-400'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-[22px] w-[22px]" />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1 text-[10px] font-medium transition-colors ${
              moreActive ? 'text-navy' : 'text-gray-400'
            }`}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal className="h-[22px] w-[22px]" />
            More
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}
