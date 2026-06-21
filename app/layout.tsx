import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SmoothScroll } from "@/components/smooth-scroll";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import "./globals.css";

const siteUrl = env.NEXT_PUBLIC_APP_URL;

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "StayPrime PH",
  url: siteUrl,
  logo: `${siteUrl}/icon.svg`,
  description:
    "Book affordable staycations, vacation rentals, condos, and short-term stays across the Philippines.",
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "StayPrime PH",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/search?location={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "StayPrime PH | Book Staycations, Vacation Rentals & Short-Term Stays in the Philippines",
    template: "%s | StayPrime PH",
  },
  description:
    "Find affordable staycations, vacation rentals, condos, private homes, and short-term stays across the Philippines. Book your next stay easily with StayPrime PH.",
  applicationName: "StayPrime PH",
  keywords: [
    "vacation rentals Philippines",
    "staycation Philippines",
    "short term rentals Philippines",
    "condo rental Philippines",
    "affordable staycation Philippines",
    "private vacation homes",
    "furnished rentals",
    "holiday rentals",
    "monthly rentals",
    "Airbnb alternative Philippines",
    "Manila staycation",
    "Tagaytay staycation",
    "Cebu vacation rentals",
    "Boracay vacation rentals",
    "Baguio staycation",
    "book a place to stay",
    "places to stay near me",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "StayPrime PH | Book Staycations, Vacation Rentals & Short-Term Stays in the Philippines",
    description:
      "Find affordable staycations, vacation rentals, condos, private homes, and short-term stays across the Philippines. Book your next stay easily with StayPrime PH.",
    url: env.NEXT_PUBLIC_APP_URL,
    siteName: "StayPrime PH",
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StayPrime PH | Staycations & Vacation Rentals in the Philippines",
    description:
      "Affordable staycations, vacation rentals, condos, and short-term stays across the Philippines. Book easily with StayPrime PH.",
  },
  manifest: "/manifest.webmanifest",
  verification: {
    // Google Search Console domain verification ("HTML tag" method). The token
    // is a public meta tag; GOOGLE_SITE_VERIFICATION can override it if rotated.
    google: process.env.GOOGLE_SITE_VERIFICATION ?? "Owt8FdC5_j7cGkJxf_zcy2ykQkeawtzJQfs1AVx0mpA",
  },
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
        <JsonLd data={organizationLd} />
        <JsonLd data={websiteLd} />
        <SmoothScroll />
        {children}
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "enabled" ? <Analytics /> : null}
      </body>
    </html>
  );
}
