import type { Metadata } from "next";
import { Orbitron, Montserrat } from "next/font/google";
import { ThemeProvider } from "@rocketreplai/ui/components/shared/theme-provider";
import "./globals.css";
import StarsBackground from "@/components/insta/StarsBackground";
import { ClerkProvider } from "@clerk/nextjs";
import { cn } from "@rocketreplai/shared";

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
  description: "AI-Agent, Web-Dev and Chatbot Agency",
  keywords: ["ai", "ai chatbot", "instagram automation"],
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
          colorPrimary: "#ec4899",
          fontFamily: "Montserrat, sans-serif",
        },
      }}
    >
      <html suppressHydrationWarning lang="en">
        <body
          className={cn(
            orbitron.variable,
            montserrat.variable,
            "font-montserrat  min-h-screen bg-[#F8F9FA]  text-foreground transition-colors duration-300",
          )}
        >
          <ThemeProvider>
            {/* <StarsBackground /> */}
            <div className="relative z-10">{children}</div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
