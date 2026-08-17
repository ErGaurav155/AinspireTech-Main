import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  CalendarDays,
  CreditCard,
  Instagram,
  LayoutDashboard,
  MessageCircle,
  PackageCheck,
  PhoneCall,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";

export type AdminNavHref = "/admin" | `/admin/${string}`;
export type AdminNavColor =
  | "blue"
  | "purple"
  | "green"
  | "pink"
  | "cyan"
  | "amber"
  | "red"
  | "gray";

export interface AdminNavItem {
  id: string;
  label: string;
  mobileLabel: string;
  description: string;
  href: AdminNavHref;
  icon: LucideIcon;
  color: AdminNavColor;
  mobilePrimary: boolean;
}

export interface AdminNavColorClasses {
  icon: {
    dark: string;
    light: string;
  };
  text: {
    dark: string;
    light: string;
  };
  surface: {
    dark: string;
    light: string;
  };
  dot: string;
  gradient: string;
}

export const ADMIN_NAV_COLOR_CLASSES: Record<
  AdminNavColor,
  AdminNavColorClasses
> = {
  blue: {
    icon: {
      dark: "bg-blue-500/20 border border-blue-500/30",
      light: "bg-blue-100 border border-blue-200",
    },
    text: { dark: "text-blue-400", light: "text-blue-600" },
    surface: { dark: "bg-blue-500/10", light: "bg-blue-50" },
    dot: "bg-blue-500",
    gradient: "bg-gradient-to-br from-blue-400 to-blue-600",
  },
  purple: {
    icon: {
      dark: "bg-purple-500/20 border border-purple-500/30",
      light: "bg-purple-100 border border-purple-200",
    },
    text: { dark: "text-purple-400", light: "text-purple-600" },
    surface: { dark: "bg-purple-500/10", light: "bg-purple-50" },
    dot: "bg-purple-500",
    gradient: "bg-gradient-to-br from-purple-400 to-purple-600",
  },
  green: {
    icon: {
      dark: "bg-green-500/20 border border-green-500/30",
      light: "bg-green-100 border border-green-200",
    },
    text: { dark: "text-green-400", light: "text-green-600" },
    surface: { dark: "bg-green-500/10", light: "bg-green-50" },
    dot: "bg-green-500",
    gradient: "bg-gradient-to-br from-green-400 to-green-600",
  },
  pink: {
    icon: {
      dark: "bg-pink-500/20 border border-pink-500/30",
      light: "bg-pink-100 border border-pink-200",
    },
    text: { dark: "text-pink-400", light: "text-pink-600" },
    surface: { dark: "bg-pink-500/10", light: "bg-pink-50" },
    dot: "bg-pink-500",
    gradient: "bg-gradient-to-br from-pink-400 to-pink-600",
  },
  cyan: {
    icon: {
      dark: "bg-cyan-500/20 border border-cyan-500/30",
      light: "bg-cyan-100 border border-cyan-200",
    },
    text: { dark: "text-cyan-400", light: "text-cyan-600" },
    surface: { dark: "bg-cyan-500/10", light: "bg-cyan-50" },
    dot: "bg-cyan-500",
    gradient: "bg-gradient-to-br from-cyan-400 to-cyan-600",
  },
  amber: {
    icon: {
      dark: "bg-amber-500/20 border border-amber-500/30",
      light: "bg-amber-100 border border-amber-200",
    },
    text: { dark: "text-amber-400", light: "text-amber-600" },
    surface: { dark: "bg-amber-500/10", light: "bg-amber-50" },
    dot: "bg-amber-500",
    gradient: "bg-gradient-to-br from-amber-400 to-amber-600",
  },
  red: {
    icon: {
      dark: "bg-red-500/20 border border-red-500/30",
      light: "bg-red-100 border border-red-200",
    },
    text: { dark: "text-red-400", light: "text-red-600" },
    surface: { dark: "bg-red-500/10", light: "bg-red-50" },
    dot: "bg-red-500",
    gradient: "bg-gradient-to-br from-red-400 to-red-600",
  },
  gray: {
    icon: {
      dark: "bg-gray-500/20 border border-gray-500/30",
      light: "bg-gray-100 border border-gray-200",
    },
    text: { dark: "text-gray-400", light: "text-gray-600" },
    surface: { dark: "bg-gray-500/10", light: "bg-gray-50" },
    dot: "bg-gray-500",
    gradient: "bg-gradient-to-br from-gray-400 to-gray-600",
  },
};

export const ADMIN_NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    mobileLabel: "Home",
    description: "Business overview",
    href: "/admin",
    icon: LayoutDashboard,
    color: "blue",
    mobilePrimary: true,
  },
  {
    id: "customers",
    label: "Customers",
    mobileLabel: "Customers",
    description: "Users and accounts",
    href: "/admin/customers",
    icon: Users,
    color: "purple",
    mobilePrimary: true,
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    mobileLabel: "Subs",
    description: "Plans and billing",
    href: "/admin/subscriptions",
    icon: CreditCard,
    color: "green",
    mobilePrimary: true,
  },
  {
    id: "instagram",
    label: "Instagram",
    mobileLabel: "Insta",
    description: "Accounts and automation",
    href: "/admin/insta",
    icon: Instagram,
    color: "pink",
    mobilePrimary: false,
  },
  {
    id: "web-ai",
    label: "Web AI",
    mobileLabel: "Web AI",
    description: "Chatbots and usage",
    href: "/admin/web",
    icon: Bot,
    color: "cyan",
    mobilePrimary: false,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    mobileLabel: "WhatsApp",
    description: "Workspaces and messaging",
    href: "/admin/whatsapp",
    icon: MessageCircle,
    color: "green",
    mobilePrimary: false,
  },
  {
    id: "voice-ai",
    label: "Voice AI",
    mobileLabel: "Voice",
    description: "Calls and assistants",
    href: "/admin/call",
    icon: PhoneCall,
    color: "purple",
    mobilePrimary: false,
  },
  {
    id: "packages",
    label: "Packages",
    mobileLabel: "Packages",
    description: "Service packages",
    href: "/admin/packages",
    icon: PackageCheck,
    color: "amber",
    mobilePrimary: false,
  },
  {
    id: "appointments",
    label: "Appointments",
    mobileLabel: "Bookings",
    description: "Bookings and enquiries",
    href: "/admin/appointments",
    icon: CalendarDays,
    color: "blue",
    mobilePrimary: false,
  },
  {
    id: "payouts",
    label: "Payouts",
    mobileLabel: "Payouts",
    description: "Affiliate payouts",
    href: "/admin/payouts",
    icon: WalletCards,
    color: "amber",
    mobilePrimary: true,
  },
  {
    id: "rate-limits",
    label: "Rate Limits",
    mobileLabel: "Limits",
    description: "API usage and limits",
    href: "/admin/rate-limits",
    icon: Activity,
    color: "red",
    mobilePrimary: false,
  },
  {
    id: "settings",
    label: "Settings",
    mobileLabel: "Settings",
    description: "Admin preferences",
    href: "/admin/settings",
    icon: Settings,
    color: "gray",
    mobilePrimary: false,
  },
] as const satisfies readonly AdminNavItem[];

export const ADMIN_MOBILE_PRIMARY_ITEMS = ADMIN_NAV_ITEMS.filter(
  (item) => item.mobilePrimary,
);

export function isAdminNavItemActive(
  pathname: string,
  href: AdminNavHref,
): boolean {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveAdminNavItem(pathname: string): AdminNavItem {
  return (
    ADMIN_NAV_ITEMS.find((item) =>
      isAdminNavItemActive(pathname, item.href),
    ) ?? ADMIN_NAV_ITEMS[0]
  );
}
