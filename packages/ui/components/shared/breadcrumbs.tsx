"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { LayoutDashboard } from "lucide-react";

export function BreadcrumbsDefault() {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);

  const lastSegment = pathSegments[pathSegments.length - 1];

  return (
    <div className="w-full  px-4">
      {/* ✅ FULL Breadcrumb (Large Screens Only) */}
      <div className="hidden lg:flex items-center gap-1 xl:gap-2 backdrop-blur-md rounded-full px-3 xl:px-6 py-2 text-sm whitespace-nowrap">
        <LayoutDashboard className=" h-4 w-4 text-pink-400 shrink-0" />
        <Link href="/" className="text-gray-700 font-medium">
          Home
        </Link>
        {pathSegments.length > 2 ? (
          <>
            <ChevronRightIcon className="h-4 w-4 text-gray-300 shrink-0" />
            <span className="text-gray-500 shrink-0">...</span>
            <ChevronRightIcon className="h-4 w-4 text-gray-300 shrink-0" />
            <span className="text-gray-900 font-medium truncate max-w-[140px]">
              {lastSegment?.replace(/-/g, " ")}
            </span>
          </>
        ) : (
          pathSegments.map((segment, index) => {
            const href = "/" + pathSegments.slice(0, index + 1).join("/");
            const isLast = index === pathSegments.length - 1;

            return (
              <div key={href} className="flex items-center gap-1 xl:gap-2">
                <ChevronRightIcon className="h-4 w-4 text-gray-300 shrink-0" />
                <Link
                  href={href}
                  className={`capitalize ${
                    isLast
                      ? "text-gray-900 font-medium"
                      : "text-gray-700 opacity-80 hover:opacity-100"
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
      <div className="flex lg:hidden items-center gap-2 backdrop-blur-md rounded-full py-2 text-sm overflow-hidden whitespace-nowrap">
        <LayoutDashboard className="hidden lg:inline-flex h-4 w-4 text-pink-400 shrink-0" />

        <Link href="/" className="text-gray-700 font-medium shrink-0">
          Home
        </Link>

        {pathSegments.length > 0 && (
          <>
            <ChevronRightIcon className="h-4 w-4 text-gray-300 shrink-0" />
            <span className="text-gray-500 shrink-0">...</span>
            <ChevronRightIcon className="h-4 w-4 text-gray-300 shrink-0" />
            <span className="text-gray-900 font-medium truncate max-w-[140px]">
              {lastSegment?.replace(/-/g, " ")}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
