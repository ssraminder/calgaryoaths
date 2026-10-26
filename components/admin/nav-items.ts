// Single source of truth for admin navigation.
// Used by Sidebar (desktop) and AdminBottomNav (mobile) so pages can't go missing on one of them.
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardCheck,
  Users,
  Wrench,
  MapPin,
  BarChart3,
  Settings,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown directly in the mobile bottom bar; everything else goes under "More". */
  primaryMobile?: boolean;
};

export const adminNavItems: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, primaryMobile: true },
  { label: 'Bookings', href: '/admin/bookings', icon: CalendarCheck, primaryMobile: true },
  { label: 'Orders', href: '/admin/orders', icon: FileText, primaryMobile: true },
  { label: 'Reviews', href: '/admin/reviews', icon: ClipboardCheck },
  { label: 'Vendors', href: '/admin/vendors', icon: Users, primaryMobile: true },
  { label: 'Services', href: '/admin/services', icon: Wrench },
  { label: 'Locations', href: '/admin/locations', icon: MapPin },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export function isAdminNavActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}
