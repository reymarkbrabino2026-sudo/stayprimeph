import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { headers } from "next/headers";
import { SmoothScroll } from "@/components/smooth-scroll";
import { JsonLd } from "@/components/seo/json-ld";
import { cspNonceHeaderName } from "@/lib/content-security-policy";
import { env } from "@/lib/env";
import "./globals.css";

const siteUrl = env.NEXT_PUBLIC_APP_URL;
const brandIconUrl = `${siteUrl}/favicon-512x512.png`;

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "StayPrime PH",
  url: siteUrl,
  logo: brandIconUrl,
  image: brandIconUrl,
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
    default: "StayPrime PH | Staycations & Vacation Rentals",
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
    title: "StayPrime PH | Staycations & Vacation Rentals",
    description:
      "Find affordable staycations, vacation rentals, condos, private homes, and short-term stays across the Philippines. Book your next stay easily with StayPrime PH.",
    url: env.NEXT_PUBLIC_APP_URL,
    siteName: "StayPrime PH",
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StayPrime PH | Staycations & Vacation Rentals",
    description:
      "Affordable staycations, vacation rentals, condos, and short-term stays across the Philippines. Book easily with StayPrime PH.",
  },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
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

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get(cspNonceHeaderName) ?? undefined;

  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationLd} nonce={nonce} />
        <JsonLd data={websiteLd} nonce={nonce} />
        <SmoothScroll />
        {children}
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "enabled" ? <Analytics /> : null}
      </body>
    </html>
  );
}
