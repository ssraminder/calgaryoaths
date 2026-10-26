'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { MoreHorizontal, Phone, MessageSquare, X, LogOut, ChevronRight } from 'lucide-react';
import { vendorNavItems, isVendorNavActive } from '@/components/vendor/nav-items';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const primaryItems = vendorNavItems.filter((i) => i.primaryMobile);
const moreItems = vendorNavItems.filter((i) => !i.primaryMobile);

const ADMIN_PHONE = 'tel:5876000746';
const ADMIN_SMS = 'sms:5876000746?body=Hi%2C%20I%20need%20help%20with%20the%20Partner%20Portal.';
const ADMIN_EMAIL = 'mailto:info@calgaryoaths.com?subject=Partner%20Portal%20Help';

export default function BottomNav({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreItems.some((i) => isVendorNavActive(pathname, i.href));

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/vendor/login');
  }

  return (
    <>
      {/* More sheet: pages that don't fit in the bar, plus help and logout */}
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
              <div>
                <h3 className="text-base font-semibold text-gray-900">More</h3>
                {userName && <p className="text-xs text-gray-500 mt-0.5">{userName}</p>}
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="mb-4 divide-y divide-gray-100 rounded-xl border border-gray-200" aria-label="More pages">
              {moreItems.map(({ label, href, icon: Icon }) => {
                const active = isVendorNavActive(pathname, href);
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
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Need help?</p>
            <div className="space-y-2">
              <a
                href={ADMIN_PHONE}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 active:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Call Admin</p>
                  <p className="text-xs text-gray-500">(587) 600-0746</p>
                </div>
              </a>
              <a
                href={ADMIN_SMS}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 active:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Send a Text</p>
                  <p className="text-xs text-gray-500">(587) 600-0746</p>
                </div>
              </a>
              <a
                href={ADMIN_EMAIL}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 active:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
                  <svg className="h-5 w-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-xs text-gray-500">info@calgaryoaths.com</p>
                </div>
              </a>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-4 active:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <LogOut className="h-5 w-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Logout</p>
                  <p className="text-xs text-gray-500">Sign out of the portal</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
        <div className="flex items-center justify-around px-2 pt-2.5 pb-2">
          {primaryItems.map(({ label, href, icon: Icon }) => {
            const active = isVendorNavActive(pathname, href);
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
        {/* Safe area padding for iPhones with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}
