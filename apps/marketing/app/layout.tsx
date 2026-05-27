import type { Metadata } from "next";
import { Suspense } from "react";
import { Orbitron, Montserrat } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@rocketreplai/ui";
// @ts-ignore
import "./globals.css";
import StarsBackground from "../../../packages/ui/src/components/shared/StarsBackground";
import MetaPixel from "@/components/shared/MetaPixel";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
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
          orbitron.variable,
          montserrat.variable,
          "font-orbitron min-h-screen bg-background  text-foreground transition-colors duration-300",
        )}
      >
        <ThemeProvider>
          <StarsBackground />
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
