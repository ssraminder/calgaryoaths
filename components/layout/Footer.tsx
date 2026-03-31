import Link from 'next/link';
import Image from 'next/image';
import { commissioners } from '@/lib/data/commissioners';

const quickLinks = [
  { href: '/services', label: 'Services' },
  { href: '/locations', label: 'Locations' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/join', label: 'Join Our Network' },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-content py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Column 1 — Brand */}
          <div>
            <div className="mb-4">
              <Image
                src="https://ogxklbdjffbhtlabwonl.supabase.co/storage/v1/object/public/assets/calgaryoaths.png"
                alt="Calgary Oaths"
                width={120}
                height={40}
                className="h-10 w-auto object-contain [filter:brightness(0)_invert(1)]"
              />
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {"Calgary's trusted Commissioner of Oaths and Notary. Serving Downtown and NE Calgary."}
            </p>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-gold/30 flex items-center justify-center transition-colors"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-gold/30 flex items-center justify-center transition-colors"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2 — Quick Links */}
          <div>
            <h3 className="font-display font-semibold text-white mb-4 text-base">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/70 text-sm hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Commissioner Booking */}
          <div>
            <h3 className="font-display font-semibold text-white mb-4 text-base">Book an Appointment</h3>
            <div className="space-y-3">
              {commissioners.map((c) => (
                <div key={c.id} className="bg-white/5 rounded-card p-4 border border-white/10">
                  <p className="font-body font-medium text-white text-sm">{c.name}</p>
                  <p className="text-white/60 text-xs mt-0.5 mb-3">{c.location} · {c.address.split(',')[0]}</p>
                  <a
                    href={c.calendlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-medium text-gold hover:text-gold-light transition-colors uppercase tracking-wide"
                  >
                    Book with {c.name.split(' ')[0]} →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-content py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <p>© 2025 Calgary Oaths · Operated by Cethos Solutions Inc.</p>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-white/80 transition-colors">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="hover:text-white/80 transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
