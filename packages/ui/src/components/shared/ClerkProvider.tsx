"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export function ClerkThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <ClerkProvider
      appearance={{
        theme: theme === "dark" ? dark : undefined,
        variables: {
          colorPrimary: "#ec4899",
          fontFamily: "Montserrat, sans-serif",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
