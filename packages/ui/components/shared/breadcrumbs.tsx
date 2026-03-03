"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { LayoutDashboard, Home } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";

// Theme map matching the dashboard's pattern
function buildTheme(isDark: boolean) {
  return {
    container: isDark ? "w-full px-4" : "w-full px-4",
    breadcrumbFull: isDark
      ? "hidden lg:flex items-center gap-1 xl:gap-2 glass-pill rounded-full px-3 xl:px-6 py-2 text-sm whitespace-nowrap"
      : "hidden lg:flex items-center gap-1 xl:gap-2 bg-white border border-gray-100 shadow-sm rounded-full px-3 xl:px-6 py-2 text-sm whitespace-nowrap",
    breadcrumbCollapsed: isDark
      ? "flex lg:hidden items-center gap-2 glass-pill rounded-full py-2 px-3 text-sm overflow-hidden whitespace-nowrap"
      : "flex lg:hidden items-center gap-2 bg-white border border-gray-100 shadow-sm rounded-full px-3 py-2 text-sm overflow-hidden whitespace-nowrap",
    homeLink: isDark
      ? "text-white/70 hover:text-white font-medium transition-colors shrink-0"
      : "text-gray-700 hover:text-gray-900 font-medium transition-colors shrink-0",
    activeLink: isDark
      ? "text-white font-medium truncate max-w-[140px]"
      : "text-gray-900 font-medium truncate max-w-[140px]",
    inactiveLink: isDark
      ? "text-white/50 hover:text-white/70 transition-colors"
      : "text-gray-700 opacity-80 hover:opacity-100 transition-colors",
    breadcrumbSeparator: isDark
      ? "h-4 w-4 text-white/20 shrink-0"
      : "h-4 w-4 text-gray-300 shrink-0",
    breadcrumbEllipsis: isDark
      ? "text-white/40 shrink-0"
      : "text-gray-500 shrink-0",
    icon: isDark
      ? "h-4 w-4 text-pink-400 shrink-0"
      : "h-4 w-4 text-pink-500 shrink-0",
  } as const;
}

export function BreadcrumbsDefault() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const themeStyles = useMemo(() => buildTheme(isDark), [isDark]);

  const pathSegments = pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1];

  return (
    <div className={themeStyles.container}>
      {/* ✅ FULL Breadcrumb (Large Screens Only) */}
      <div className={themeStyles.breadcrumbFull}>
        <LayoutDashboard className={themeStyles.icon} />
        <Link href="/" className={themeStyles.homeLink}>
          Home
        </Link>
        {pathSegments.length > 2 ? (
          <>
            <ChevronRightIcon className={themeStyles.breadcrumbSeparator} />
            <span className={themeStyles.breadcrumbEllipsis}>...</span>
            <ChevronRightIcon className={themeStyles.breadcrumbSeparator} />
            <span className={themeStyles.activeLink}>
              {lastSegment?.replace(/-/g, " ")}
            </span>
          </>
        ) : (
          pathSegments.map((segment, index) => {
            const href = "/" + pathSegments.slice(0, index + 1).join("/");
            const isLast = index === pathSegments.length - 1;

            return (
              <div key={href} className="flex items-center gap-1 xl:gap-2">
                <ChevronRightIcon className={themeStyles.breadcrumbSeparator} />
                <Link
                  href={href}
                  className={`capitalize ${
                    isLast ? themeStyles.activeLink : themeStyles.inactiveLink
                  }`}
                >
                  {segment.replace(/-/g, " ")}
                </Link>
              </div>
            );
          })
        )}
      </div>

      {/* ✅ COLLAPSED Breadcrumb (Mobile & Medium Screens) */}
      <div className={themeStyles.breadcrumbCollapsed}>
        <Home className={`${themeStyles.icon} hidden lg:inline-flex`} />

        <Link href="/" className={themeStyles.homeLink}>
          Home
        </Link>

        {pathSegments.length > 0 && (
          <>
            <ChevronRightIcon className={themeStyles.breadcrumbSeparator} />
            <span className={themeStyles.breadcrumbEllipsis}>...</span>
            <ChevronRightIcon className={themeStyles.breadcrumbSeparator} />
            <span className={themeStyles.activeLink}>
              {lastSegment?.replace(/-/g, " ")}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
