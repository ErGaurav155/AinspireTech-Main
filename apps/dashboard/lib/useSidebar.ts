"use client";

import { useState, useEffect, useCallback } from "react";

const DESKTOP_BREAKPOINT = 768; // md

export function useSidebar(defaultOpen?: boolean) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Determine initial state on the client
    const initial =
      defaultOpen !== undefined
        ? defaultOpen
        : window.innerWidth >= DESKTOP_BREAKPOINT;

    setIsOpen(initial);

    const handleResize = () => {
      setIsOpen(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [defaultOpen]);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, toggle, open, close } as const;
}
