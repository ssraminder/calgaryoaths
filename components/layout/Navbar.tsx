'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone } from 'lucide-react';
import BookButton from '@/components/shared/BookButton';
import { trackPhoneClick } from '@/lib/analytics';

const navLinks = [
  { href: '/services', label: 'Services' },
  { href: '/locations', label: 'Locations' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full bg-white transition-shadow duration-200 ${
          scrolled ? 'shadow-card' : 'border-b border-border'
        }`}
      >
        <div className="max-content flex items-center justify-between py-3 lg:py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="https://ogxklbdjffbhtlabwonl.supabase.co/storage/v1/object/public/assets/calgaryoaths.png"
              alt="Calgary Oaths"
              width={220}
              height={74}
              className="h-20 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-body font-medium transition-colors hover:text-gold ${
                  pathname?.startsWith(link.href) ? 'text-gold' : 'text-charcoal'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="tel:5876000746"
              onClick={() => trackPhoneClick('navbar_desktop')}
              className="text-sm font-body font-medium text-charcoal hover:text-gold transition-colors flex items-center gap-1.5"
            >
              <Phone size={15} />
              (587) 600-0746
            </a>
            <BookButton label="Book Appointment" variant="primary" size="sm" />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-charcoal hover:text-navy transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-charcoal/40" />
        </div>
      )}
      <div
        className={`fixed top-0 right-0 bottom-0 z-40 w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Image
            src="https://ogxklbdjffbhtlabwonl.supabase.co/storage/v1/object/public/assets/calgaryoaths.png"
            alt="Calgary Oaths"
            width={140}
            height={48}
            className="h-12 w-auto object-contain"
          />
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 text-mid-grey hover:text-charcoal"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-6 space-y-1" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block py-3 text-base font-body font-medium border-b border-border transition-colors hover:text-gold ${
                pathname?.startsWith(link.href) ? 'text-gold' : 'text-charcoal'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="tel:5876000746"
            onClick={() => trackPhoneClick('navbar_mobile')}
            className="flex items-center gap-2 py-3 text-base font-body font-medium text-charcoal hover:text-gold transition-colors border-b border-border"
          >
            <Phone size={16} />
            (587) 600-0746
          </a>
        </nav>

        <div className="p-6">
          <BookButton label="Book Appointment" variant="primary" className="w-full justify-center" />
        </div>
      </div>
    </>
  );
}
