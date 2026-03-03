import type { Metadata } from "next";
import { Orbitron, Montserrat } from "next/font/google";
import { ThemeProvider } from "@rocketreplai/ui/components/shared/theme-provider";
import "./globals.css";
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
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#ec4899",
          fontFamily: "Montserrat, sans-serif",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            orbitron.variable,
            montserrat.variable,
            "font-montserrat min-h-screen text-foreground ",
          )}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
          >
            <div className="relative z-10 min-h-screen">{children}</div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
