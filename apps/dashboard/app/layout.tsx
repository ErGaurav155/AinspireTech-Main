import type { Metadata } from "next";
import { Orbitron, Montserrat } from "next/font/google";
import { ThemeProvider } from "@ainspiretech/ui/components/shared/theme-provider";
import "./globals.css";
import StarsBackground from "@/components/insta/StarsBackground";
import { ClerkProvider } from "@clerk/nextjs";
import { cn } from "@ainspiretech/shared";
import Navbar from "@/components/insta/Navbar";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "AinspireTech",
  description: "Ai-Agent,Web-Dev and Chatbot Agency",
  keywords: ["a i", "a i chatbot"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#624cf5",
          fontFamily: "Montserrat, sans-serif",
        },
      }}
    >
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
            <div className="relative z-10">
              <Navbar />
              {children}
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
