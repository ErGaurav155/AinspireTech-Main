import type { Metadata } from "next";
import { Orbitron, Montserrat } from "next/font/google";
import { ThemeProvider } from "@rocketreplai/ui";
// @ts-ignore
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClerkThemeProvider } from "@rocketreplai/ui";

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
          <ClerkThemeProvider>
            <div className="relative z-10 min-h-screen">{children}</div>
            <script
              src="https://app.rocketreplai.com/mcqchatbotembed.js"
              data-mcq-chatbot='{
    "userId":"user_3BwWyVtmCQMqb8QfJAKq7N8Roff",
    "isAuthorized":true,
    "chatbotType":"chatbot-education",
    "apiUrl":"https://rocketreplai.com",
    "primaryColor":"#10B981",
    "position":"bottom-right",
    "welcomeMessage":"Hello! How can I help you today?",
    "chatbotName":"AskMe"
  }'
            ></script>
          </ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
