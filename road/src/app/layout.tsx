import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppHeader } from "@/components/layout/app-header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ROAD — Spot it. Report it. Follow the fix.",
  description:
    "Civic road damage intelligence platform. Spot road hazards, classify damage with AI, and track repairs in your community in real-time.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0F766E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-screen flex flex-col bg-background text-text-primary">
        {/* Skip to Content Link for WCAG Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>

        <Providers>
          <AppHeader />
          <main id="main-content" className="flex-1 flex flex-col">
            {children}
          </main>
          <MobileNavigation />
        </Providers>
      </body>
    </html>
  );
}
