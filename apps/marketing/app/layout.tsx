import type { Metadata } from "next";
import { Orbitron, Montserrat } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@rocketreplai/ui/components/shared/theme-provider";
import "./globals.css";
import StarsBackground from "@rocketreplai/ui/components/shared/StarsBackground";

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
  keywords: ["a i", "a i chatbot"],
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
      </body>
    </html>
  );
}
