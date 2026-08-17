"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Shield, ChevronRight } from "lucide-react";
import { Badge, useThemeStyles } from "@rocketreplai/ui";
import {
  ADMIN_MOBILE_PRIMARY_ITEMS,
  ADMIN_NAV_COLOR_CLASSES,
  ADMIN_NAV_ITEMS,
  getActiveAdminNavItem,
  isAdminNavItemActive,
} from "@/lib/admin-nav";

export default function AdminBottomNavbar() {
  const pathname = usePathname();
  const { styles, isDark } = useThemeStyles();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeSection = useMemo(
    () => getActiveAdminNavItem(pathname),
    [pathname],
  );

  const isActive = useCallback(
    (href: (typeof ADMIN_NAV_ITEMS)[number]["href"]) =>
      isAdminNavItemActive(pathname, href),
    [pathname],
  );

  const ActiveSectionIcon = activeSection.icon;
  const activeColorClasses = ADMIN_NAV_COLOR_CLASSES[activeSection.color];

  return (
    <>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <AnimatePresence>
          {menuOpen && (
            <DropdownMenu.Portal forceMount>
              <DropdownMenu.Content asChild sideOffset={8}>
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className={`fixed  bottom-0 -right-5 z-50 w-64 md:hidden rounded-xl overflow-hidden ${
                    isDark
                      ? "bg-white/[0.04] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[24px]"
                      : "bg-white border border-gray-100 shadow-sm"
                  }`}
                >
                  <div className={`px-4 py-3 border-b ${styles.divider}`}>
                    <p
                      className={`text-xs font-medium tracking-wider ${styles.text.muted}`}
                    >
                      Admin Menu
                    </p>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto">
                    {ADMIN_NAV_ITEMS.map((section) => {
                      const Icon = section.icon;
                      const active = isActive(section.href);
                      const colorClasses =
                        ADMIN_NAV_COLOR_CLASSES[section.color];

                      return (
                        <DropdownMenu.Item asChild key={section.id}>
                          <Link
                            href={section.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3.5 transition-colors border-b ${styles.divider} ${styles.rowHover}`}
                          >
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isDark
                                  ? colorClasses.icon.dark
                                  : colorClasses.icon.light
                              }`}
                            >
                              <Icon
                                className={`h-4 w-4 ${
                                  isDark
                                    ? colorClasses.text.dark
                                    : colorClasses.text.light
                                }`}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-semibold truncate ${
                                  active
                                    ? styles.text.primary
                                    : styles.text.secondary
                                }`}
                              >
                                {section.label}
                              </p>
                              <p className={`text-xs ${styles.text.muted}`}>
                                {section.description}
                              </p>
                            </div>

                            {active && (
                              <div
                                className={`w-2 h-2 rounded-full ${colorClasses.dot}`}
                              />
                            )}
                          </Link>
                        </DropdownMenu.Item>
                      );
                    })}
                  </div>

                  <div className={`p-3 ${styles.badge.blue}`}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-xs font-medium">Admin Access</span>
                      <Badge
                        className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full"
                        variant="outline"
                      >
                        Owner
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          )}
        </AnimatePresence>

        <nav
          className={`fixed bottom-0 left-0 right-0 z-[45] md:hidden ${
            isDark
              ? "bg-[rgba(10,10,16,0.85)] backdrop-blur-[32px] border-t border-white/[0.06]"
              : "bg-white/90 backdrop-blur-[12px] border-t border-gray-100"
          }`}
        >
          <div className="flex items-center justify-around h-16 px-2">
            {ADMIN_MOBILE_PRIMARY_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              const colorClasses = ADMIN_NAV_COLOR_CLASSES[item.color];

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className={`absolute inset-x-2 top-1 bottom-1 rounded-xl ${
                        isDark ? "bg-blue-500/10" : "bg-cyan-50"
                      }`}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}

                  <span className="relative">
                    <Icon
                      className={`h-5 w-5 transition-colors duration-150 ${
                        active
                          ? isDark
                            ? colorClasses.text.dark
                            : colorClasses.text.light
                          : isDark
                            ? "text-white/60"
                            : "text-gray-500"
                      }`}
                    />
                  </span>

                  <span
                    className={`relative text-[10px] font-semibold transition-colors duration-150 ${
                      active
                        ? isDark
                          ? colorClasses.text.dark
                          : colorClasses.text.light
                        : isDark
                          ? "text-white/60"
                          : "text-gray-500"
                    }`}
                  >
                    {item.mobileLabel}
                  </span>
                </Link>
              );
            })}

            <DropdownMenu.Trigger asChild>
              <button
                ref={triggerRef}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative"
              >
                {menuOpen && (
                  <span
                    className={`absolute inset-x-2 top-1 bottom-1 rounded-xl ${
                      isDark ? "bg-blue-500/10" : "bg-cyan-50"
                    }`}
                  />
                )}

                <span className="relative">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full shadow-sm ${activeColorClasses.gradient}`}
                  >
                    <ActiveSectionIcon className="h-3.5 w-3.5 text-white" />
                  </span>

                  <span
                    className={`absolute -bottom-0.5 -right-1 w-3 h-3 rounded-full flex items-center justify-center shadow-sm ${styles.pill}`}
                  >
                    <ChevronRight
                      className={`h-2 w-2 transition-transform duration-200 ${
                        menuOpen ? "rotate-90" : ""
                      } ${isDark ? "text-white/60" : "text-gray-500"}`}
                    />
                  </span>
                </span>

                <span
                  className={`relative text-[10px] font-semibold transition-colors duration-150 max-w-[52px] truncate ${
                    menuOpen
                      ? isDark
                        ? "text-blue-400"
                        : "text-cyan-600"
                      : isDark
                        ? "text-white/60"
                        : "text-gray-500"
                  }`}
                >
                  Menu
                </span>
              </button>
            </DropdownMenu.Trigger>
          </div>

          <div
            className={`h-safe-area-inset-bottom ${
              isDark ? "bg-[rgba(10,10,16,0.85)]" : "bg-white/90"
            }`}
          />
        </nav>
      </DropdownMenu.Root>
    </>
  );
}
