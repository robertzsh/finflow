import {
  LayoutDashboard, ArrowLeftRight, Target, Wallet, LineChart, CalendarDays, FileBarChart, Settings, PiggyBank,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

// The app's pages, in sidebar order. Shared by the sidebar, the mobile nav, the
// top-bar breadcrumb and each page header's icon tile.
export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/savings', label: 'Economii', icon: PiggyBank },
  { to: '/investments', label: 'Investments', icon: LineChart },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const navFor = (pathname: string) => NAV.find((n) => n.to === pathname) ?? NAV[0];
