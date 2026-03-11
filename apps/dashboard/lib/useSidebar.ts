"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const DESKTOP_BREAKPOINT = 768;

export function useSidebar(defaultOpen?: boolean) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const prevWidthRef = useRef<number | null>(null); // ← track width only

  useEffect(() => {
    const checkScreen = () => {
      const currentWidth = window.innerWidth;

      // ✅ Skip if only HEIGHT changed (mobile scroll/address bar)
      if (prevWidthRef.current === currentWidth) return;
      prevWidthRef.current = currentWidth;

      const desktop = currentWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);

      // Only auto-set on first load or when crossing breakpoint
      if (defaultOpen !== undefined) {
        setIsOpen(desktop ? defaultOpen : false);
      } else {
        setIsOpen(desktop);
      }
    };

    // Initial check — always runs
    prevWidthRef.current = window.innerWidth;
    const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
    setIsDesktop(desktop);
    setIsOpen(
      defaultOpen !== undefined ? (desktop ? defaultOpen : false) : desktop,
    );

    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, [defaultOpen]);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, isDesktop, toggle, open, close } as const;
}
