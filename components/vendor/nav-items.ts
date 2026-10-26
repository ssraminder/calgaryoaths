// Single source of truth for vendor portal navigation.
// Used by VendorSidebar (desktop) and BottomNav (mobile) so pages can't go missing on one of them.
import { LayoutDashboard, CalendarCheck, Clock, Calendar, DollarSign, Settings, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type VendorNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown directly in the mobile bottom bar; everything else goes under "More". */
  primaryMobile?: boolean;
};

export const vendorNavItems: VendorNavItem[] = [
  { label: 'Dashboard', href: '/vendor', icon: LayoutDashboard, primaryMobile: true },
  { label: 'Bookings', href: '/vendor/bookings', icon: CalendarCheck, primaryMobile: true },
  { label: 'Orders', href: '/vendor/orders', icon: FileText },
  { label: 'Earnings', href: '/vendor/earnings', icon: DollarSign },
  { label: 'Availability', href: '/vendor/availability', icon: Clock, primaryMobile: true },
  { label: 'Calendar', href: '/vendor/calendar', icon: Calendar, primaryMobile: true },
  { label: 'Settings', href: '/vendor/rates', icon: Settings },
];

export function isVendorNavActive(pathname: string, href: string): boolean {
  return href === '/vendor' ? pathname === '/vendor' : pathname.startsWith(href);
}
