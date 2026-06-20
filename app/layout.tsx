import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SmoothScroll } from "@/components/smooth-scroll";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "StayPrimePH | Homes, stays, and host tools in the Philippines",
    template: "%s | StayPrimePH",
  },
  description: "Book stays across the Philippines, create host listings, and manage marketplace operations from one modern vacation rental platform.",
  applicationName: "StayPrimePH",
  keywords: ["Philippines stays", "Philippines stays", "vacation rentals", "booking marketplace", "host dashboard"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "StayPrimePH | Homes, stays, and host tools in the Philippines",
    description: "Book stays, publish listings, and manage a modern marketplace for guests, hosts, and admins.",
    url: env.NEXT_PUBLIC_APP_URL,
    siteName: "StayPrimePH",
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StayPrimePH",
    description: "Vacation rental marketplace for guests, hosts, and admins.",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SmoothScroll />
        {children}
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "enabled" ? <Analytics /> : null}
      </body>
    </html>
  );
}
