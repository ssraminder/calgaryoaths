import type { Metadata, Viewport } from 'next';
import TabletShell from '@/components/tablet/TabletShell';

export const metadata: Metadata = {
  title: 'Calgary Oaths Orders',
  manifest: '/tablet-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CO Orders',
  },
  themeColor: '#1B3A5C',
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1B3A5C',
};

export default function TabletLayout({ children }: { children: React.ReactNode }) {
  return <TabletShell>{children}</TabletShell>;
}
