import type { Metadata } from 'next';
import { Phone, Mail, Calendar } from 'lucide-react';
import ContactForm from './ContactForm';
import BookButton from '@/components/shared/BookButton';

export const metadata: Metadata = {
  title: 'Contact Calgary Oaths | Book a Commissioner in Calgary',
  description:
    'Get in touch with Calgary Oaths. Call (587) 600-0746, email info@calgaryoaths.com, or fill out our contact form. Same-day service available at both Calgary locations.',
  alternates: { canonical: 'https://calgaryoaths.com/contact' },
  openGraph: { title: 'Contact | Calgary Oaths', url: 'https://calgaryoaths.com/contact' },
};

export default function ContactPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="max-content">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">Get in touch</h1>
          <p className="text-mid-grey text-lg max-w-lg mx-auto">
            We respond quickly. Call, email, or use the form below.
          </p>
        </div>

        {/* Contact method cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <a
            href="tel:5876000746"
            className="card text-center hover:shadow-card-hover transition-shadow group"
          >
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
              <Phone size={22} className="text-gold" />
            </div>
            <p className="font-display font-semibold text-charcoal">Call us</p>
            <p className="text-gold font-medium mt-1 group-hover:underline">(587) 600-0746</p>
            <p className="text-xs text-mid-grey mt-1">Mon–Fri 9 AM–9 PM · Sat 10 AM–5 PM</p>
          </a>

          <a
            href="mailto:info@calgaryoaths.com"
            className="card text-center hover:shadow-card-hover transition-shadow group"
          >
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
              <Mail size={22} className="text-gold" />
            </div>
            <p className="font-display font-semibold text-charcoal">Email us</p>
            <p className="text-gold font-medium mt-1 group-hover:underline">info@calgaryoaths.com</p>
            <p className="text-xs text-mid-grey mt-1">We reply within 2 hours</p>
          </a>

          <div className="card text-center">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
              <Calendar size={22} className="text-gold" />
            </div>
            <p className="font-display font-semibold text-charcoal">Book online</p>
            <p className="text-mid-grey text-sm mt-1 mb-3">Choose your commissioner and time</p>
            <BookButton label="Book Now" variant="primary" size="sm" className="mx-auto" />
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="font-display font-semibold text-xl text-charcoal mb-6">Send us a message</h2>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
