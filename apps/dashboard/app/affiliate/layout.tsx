import type { Metadata } from "next";

import { Suspense } from "react";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: " Affiliate Program - AinspireTech",
  description:
    " Join the AinspireTech Affiliate Program and earn commissions by promoting our AI solutions and services.",
  keywords: [
    "AinspireTech Affiliate Program, AI solutions affiliate, earn commissions, promote AI services",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <LayoutContent> {children}</LayoutContent>
    </Suspense>
  );
}

async function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="">
      {children}
      <footer />
      <Toaster />
    </main>
  );
}
