'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone } from 'lucide-react';
import BookButton from '@/components/shared/BookButton';

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
        <div className="max-content flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <circle cx="14" cy="14" r="13" stroke="#C8922A" strokeWidth="2" />
              <path d="M14 4 L16.5 10.5 L23 11 L18.5 15.5 L20 22 L14 18.5 L8 22 L9.5 15.5 L5 11 L11.5 10.5 Z" fill="#C8922A" />
            </svg>
            <span className="font-display font-bold text-navy text-xl group-hover:text-gold transition-colors">
              Calgary Oaths
            </span>
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
          <span className="font-display font-bold text-navy text-lg">Calgary Oaths</span>
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
