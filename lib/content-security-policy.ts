import { virtualTourFrameSources } from "@/lib/virtual-tour";
import { listingVideoFrameSources } from "@/lib/listing-video";

export const cspNonceHeaderName = "x-nonce";

type ContentSecurityPolicyOptions = {
  nonce?: string;
  isProduction?: boolean;
};

function uniqueSources(sources: Array<string | false | undefined>) {
  return Array.from(new Set(sources.filter(Boolean) as string[]));
}

function directive(name: string, sources: Array<string | false | undefined>) {
  return `${name} ${uniqueSources(sources).join(" ")}`;
}

export function buildContentSecurityPolicy({ nonce, isProduction = process.env.NODE_ENV === "production" }: ContentSecurityPolicyOptions = {}) {
  const nonceSource = nonce ? `'nonce-${nonce}'` : undefined;
  const scriptSources = [
    "'self'",
    nonceSource,
    "https://js.stripe.com",
    "https://checkout.stripe.com",
    "https://cdn.jsdelivr.net",
    "https://va.vercel-scripts.com",
    isProduction ? undefined : "'unsafe-eval'",
  ];
  const scriptElementSources = [
    "'self'",
    nonceSource,
    "https://js.stripe.com",
    "https://checkout.stripe.com",
    "https://cdn.jsdelivr.net",
    "https://va.vercel-scripts.com",
  ];
  const styleSources = [
    "'self'",
    nonceSource,
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ];
  const connectSources = [
    "'self'",
    "https://cdn.jsdelivr.net",
    "https://*.ingest.sentry.io",
    "https://*.sentry.io",
    "https://api.stripe.com",
    "https://checkout.stripe.com",
    "https://r.stripe.com",
    "https://m.stripe.network",
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
  ];
  const imageSources = [
    "'self'",
    "data:",
    "blob:",
    "https://res.cloudinary.com",
    "https://*.public.blob.vercel-storage.com",
    "https://a.tile.openstreetmap.org",
    "https://b.tile.openstreetmap.org",
    "https://c.tile.openstreetmap.org",
    "https://*.basemaps.cartocdn.com",
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
    directive("script-src", scriptSources),
    directive("script-src-elem", scriptElementSources),
    directive("style-src", styleSources),
    directive("style-src-elem", ["'self'", nonceSource, "https://fonts.googleapis.com"]),
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com data:",
    directive("img-src", imageSources),
    directive("connect-src", connectSources),
    directive("frame-src", [
      "https://checkout.stripe.com",
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      ...listingVideoFrameSources,
      ...virtualTourFrameSources,
    ]),
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    isProduction ? "upgrade-insecure-requests" : undefined,
  ].filter(Boolean).join("; ");
}
