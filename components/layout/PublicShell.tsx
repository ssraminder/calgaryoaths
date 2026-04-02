'use client';

import { usePathname } from 'next/navigation';

/**
 * Conditionally renders public-facing chrome (Navbar, Footer, WhatsApp, BookingModal).
 * On /admin and /vendor routes, only renders children (the page content) without
 * the public header/footer so dashboard layouts control their own chrome.
 */
export default function PublicShell({
  children,
  navbar,
  footer,
  publicExtras,
}: {
  children: React.ReactNode;
  navbar: React.ReactNode;
  footer: React.ReactNode;
  publicExtras: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/admin') || pathname.startsWith('/vendor');

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <>
      {navbar}
      <main className="flex-1">{children}</main>
      {footer}
      {publicExtras}
    </>
  );
}
