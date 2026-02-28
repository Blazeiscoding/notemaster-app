import { type Metadata, type Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NoteMaster",
  description: "Capture and organize your notes anywhere.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NoteMaster",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  other: {
    // DNS prefetch for external services
    "dns-prefetch": "//ik.imagekit.io",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* Preconnect to ImageKit for faster image loading */}
          <link rel="preconnect" href="https://ik.imagekit.io" />
          <link rel="dns-prefetch" href="https://ik.imagekit.io" />
          {/* Preconnect to Fontshare for faster Clash Display loading */}
          <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
          {/* Non-blocking preload for Clash Display (not on Google Fonts) */}
          <link
            rel="preload"
            href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600&display=swap"
            as="style"
          />
          {/* Load Clash Display stylesheet */}
          <link
            rel="stylesheet"
            href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600&display=swap"
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} antialiased`}
        >
          <TooltipProvider delayDuration={300}>
            <ErrorBoundary>
              {children}
              <Toaster position="top-right" richColors />
            </ErrorBoundary>
          </TooltipProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
