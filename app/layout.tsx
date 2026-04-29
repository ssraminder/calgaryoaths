import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import { headers } from 'next/headers';
import './globals.css';
import { BookingModalProvider } from '@/lib/context/BookingModalContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BookingModal from '@/components/layout/BookingModal';
import WhatsAppButton from '@/components/layout/WhatsAppButton';
import AuthRedirect from '@/components/shared/AuthRedirect';
import { GTMHead, GTMNoScript } from '@/components/shared/GoogleTagManager';
import { getAnalyticsSettings, getSettings } from '@/lib/data/db';

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
  icons: {
    icon: [
      { url: 'https://ogxklbdjffbhtlabwonl.supabase.co/storage/v1/object/public/assets/favicon.ico', sizes: 'any' },
      { url: 'https://ogxklbdjffbhtlabwonl.supabase.co/storage/v1/object/public/assets/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: 'https://ogxklbdjffbhtlabwonl.supabase.co/storage/v1/object/public/assets/favicon.png',
  },
  manifest: '/manifest.json',
  themeColor: '#1B3A5C',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CO Partner',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [analytics, settings, hdrs] = await Promise.all([
    getAnalyticsSettings(),
    getSettings(),
    headers(),
  ]);
  const ga4Id = analytics.ga4Id || process.env.NEXT_PUBLIC_GA4_ID;
  const gtmId = analytics.gtmId || process.env.NEXT_PUBLIC_GTM_ID;
  const gadsId = analytics.googleAdsId || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const whatsappNumber = settings.whatsapp_number || null;

  // Detect dashboard routes server-side so Navbar/Footer are never rendered.
  // /orders/c/* is the customer-handoff route (public token-based) and should also
  // render full-screen without the public site chrome.
  // /tablet/* is the in-store tablet kiosk PWA — runs full-screen, own manifest.
  const pathname = hdrs.get('x-pathname') || '';
  const isDashboard =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/vendor') ||
    pathname.startsWith('/tablet') ||
    pathname.startsWith('/orders/c/');

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="https://ogxklbdjffbhtlabwonl.supabase.co/storage/v1/object/public/assets/favicon.png" />
      </head>
      {gtmId && <GTMHead gtmId={gtmId} />}
      <body className="min-h-full flex flex-col bg-bg text-charcoal font-body" suppressHydrationWarning>
        {gtmId && <GTMNoScript gtmId={gtmId} />}
        <BookingModalProvider>
          {isDashboard ? (
            <>{children}</>
          ) : (
            <>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <BookingModal />
              {whatsappNumber && <WhatsAppButton number={whatsappNumber} />}
            </>
          )}
          <AuthRedirect />
        </BookingModalProvider>
        {ga4Id && <GoogleAnalytics gaId={ga4Id} />}
        {/* Google Ads global site tag + conversion config — values from DB/env */}
        {gadsId && (
          <>
            <Script
              id="google-ads-gtag"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${gadsId}`}
            />
            <Script
              id="google-ads-config"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: [
                  `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}`,
                  `gtag('config',${JSON.stringify(gadsId)});`,
                  `window.__ADS_CONFIG=${JSON.stringify({
                    id: gadsId,
                    bookingLabel: analytics.googleAdsBookingLabel || null,
                    phoneLabel: analytics.googleAdsPhoneLabel || null,
                  })};`,
                ].join(''),
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
