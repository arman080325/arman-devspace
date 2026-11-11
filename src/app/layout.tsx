import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { CommandPalette } from "@/components/layout/command-palette";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: `${siteConfig.supportingStatement} ${siteConfig.description}`,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.creator }],
  keywords: [
    "Arman's Devspace",
    "software engineering workspace",
    "open-source modernization",
    "100 projects",
    "Next.js",
    "TypeScript",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="dark light" />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Suspense
              fallback={
                <header className="sticky top-0 z-40 h-14 w-full border-b border-border/80 bg-background/85 backdrop-blur-md" />
              }
            >
              <Navbar />
            </Suspense>
            <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <Footer />
            <CommandPalette />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
