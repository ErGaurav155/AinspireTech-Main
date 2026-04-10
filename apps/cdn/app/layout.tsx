import type { Metadata } from "next";
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  title: "RocketReplAI Chat",
  description: "AI-powered chat widget",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "transparent",
          overflow: "hidden",
        }}
      >
        {children}
      </body>
    </html>
  );
}
