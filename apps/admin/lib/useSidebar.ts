"use client";

import { useState, useEffect, useCallback } from "react";

const DESKTOP_BREAKPOINT = 768; // md

export function useSidebar(defaultOpen?: boolean) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);

      // Only auto-open on desktop first load
      if (defaultOpen !== undefined) {
        setIsOpen(defaultOpen);
      } else {
        setIsOpen(desktop);
      }
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, [defaultOpen]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, isDesktop, toggle, open, close } as const;
}
