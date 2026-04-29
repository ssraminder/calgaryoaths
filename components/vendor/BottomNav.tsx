'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { LayoutDashboard, CalendarCheck, DollarSign, Settings, HelpCircle, Phone, MessageSquare, X, LogOut } from 'lucide-react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const navItems = [
  { label: 'Dashboard', href: '/vendor', icon: LayoutDashboard },
  { label: 'Bookings', href: '/vendor/bookings', icon: CalendarCheck },
  { label: 'Earnings', href: '/vendor/earnings', icon: DollarSign },
  { label: 'Settings', href: '/vendor/rates', icon: Settings },
];

const ADMIN_PHONE = 'tel:5876000746';
const ADMIN_SMS = 'sms:5876000746?body=Hi%2C%20I%20need%20help%20with%20the%20Partner%20Portal.';
const ADMIN_EMAIL = 'mailto:info@calgaryoaths.com?subject=Partner%20Portal%20Help';

export default function BottomNav({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/vendor/login');
  }

  return (
    <>
      {/* Help sheet */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setHelpOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-5 pb-8 shadow-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Need Help?</h3>
                {userName && <p className="text-xs text-gray-500 mt-0.5">{userName}</p>}
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
        <div className="flex items-center justify-around px-4 pt-2.5 pb-2">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = href === '/vendor' ? pathname === '/vendor' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium transition-colors ${
                  active ? 'text-navy' : 'text-gray-400'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setHelpOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium text-gray-400 transition-colors"
          >
            <HelpCircle className="h-[22px] w-[22px]" />
            Help
          </button>
        </div>
        {/* Safe area padding for iPhones with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}
