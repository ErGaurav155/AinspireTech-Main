import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@rocketreplai/ui";
// @ts-ignore
import "./globals.css";
import MetaPixel from "@/components/shared/MetaPixel";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RocketReplai",
  description: "Ai-Agent,Web-Dev and Chatbot Agency",
  keywords: [
    "rocketreplai",
    "a i chatbot",
    "insta automation",
    "web development",
    "ai agent",
    "chatbot agency",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body
        className={cn(
          inter.variable,
          "font-sans min-h-screen bg-background text-foreground antialiased transition-colors duration-300",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <div className="relative z-10">{children}</div>
        </ThemeProvider>
        <SpeedInsights />
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
      </body>
    </html>
  );
}
