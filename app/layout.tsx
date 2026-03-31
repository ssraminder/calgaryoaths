import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { BookingModalProvider } from '@/lib/context/BookingModalContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BookingModal from '@/components/layout/BookingModal';
import WhatsAppButton from '@/components/layout/WhatsAppButton';

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Commissioner of Oaths Calgary | Same-Day Service | Calgary Oaths',
    template: '%s | Calgary Oaths',
  },
  description:
    'Professional Commissioner of Oaths in Calgary. Affidavits, statutory declarations, travel consent letters & more. 2 commissioners, 2 locations + mobile. From $30. Book today.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://calgaryoaths.com'),
  openGraph: {
    siteName: 'Calgary Oaths',
    type: 'website',
    locale: 'en_CA',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-charcoal font-body">
        <BookingModalProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <BookingModal />
          <WhatsAppButton />
        </BookingModalProvider>
        {process.env.NEXT_PUBLIC_GA4_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA4_ID} />
        )}
      </body>
    </html>
  );
}
