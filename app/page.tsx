import { HomeHeroSlider } from "@/components/home/home-hero-slider";
import { PropertyRail } from "@/components/home/property-rail";
import { SiteFooter } from "@/components/home/site-footer";
import { HomeHeader } from "@/components/public/home-header";
import { JsonLd } from "@/components/seo/json-ld";
import Link from "next/link";
import type { Metadata } from "next";
import { buildHomePropertyRails } from "@/lib/home-properties";
import { getPublicListingSummaries } from "@/lib/properties";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Staycations & Vacation Rentals in the Philippines",
  description:
    "Find affordable staycations, vacation rentals, condos, private homes, and short-term stays across the Philippines with StayPrime PH.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Staycations & Vacation Rentals in the Philippines",
    description:
      "Find affordable staycations, vacation rentals, condos, private homes, and short-term stays across the Philippines with StayPrime PH.",
    url: env.NEXT_PUBLIC_APP_URL,
    type: "website",
  },
};

// Render at runtime (against the database) instead of baking the build-time
// empty data store into the static page. The listing query itself is still
// cached for 60s via getPublicListingSummaries, so this stays fast.
export const dynamic = "force-dynamic";

function homeListingsJsonLd(properties: Awaited<ReturnType<typeof getPublicListingSummaries>>) {
  const itemListElement = properties.slice(0, 12).map((property, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: property.title,
    url: `${env.NEXT_PUBLIC_APP_URL}/rooms/${property.id}`,
    item: {
      "@type": "Accommodation",
      name: property.title,
      url: `${env.NEXT_PUBLIC_APP_URL}/rooms/${property.id}`,
      ...(property.images[0]?.imageUrl ? { image: property.images[0].imageUrl } : {}),
      address: [property.barangay, property.city, property.province, property.country].filter(Boolean).join(", "),
      offers: {
        "@type": "Offer",
        price: property.pricePerNight,
        priceCurrency: "PHP",
        url: `${env.NEXT_PUBLIC_APP_URL}/rooms/${property.id}`,
      },
    },
  }));

  if (itemListElement.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "StayPrime PH staycations and vacation rentals",
    itemListElement,
  };
}

export default async function HomePage() {
  const properties = await getPublicListingSummaries();
  const propertyRails = buildHomePropertyRails(properties);
  const listingsLd = homeListingsJsonLd(properties);

  return (
    <div className="bg-white">
      {listingsLd ? <JsonLd data={listingsLd} /> : null}
      <HomeHeader />

      <HomeHeroSlider />

      <main className="w-full space-y-8 px-6 pb-24 pt-6 sm:px-6 md:space-y-10 md:px-6 md:pb-12 md:pt-12 lg:px-9 2xl:px-10">
        {propertyRails.length > 0 ? (
          propertyRails.map((rail) => (
            <PropertyRail key={rail.title} title={rail.title} items={rail.items} isAuthenticated={false} />
          ))
        ) : (
          <section className="mx-auto flex min-h-64 max-w-3xl flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">Real listings coming soon</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#083f35] sm:text-5xl">
              Discover stays hosted by real StayPrimePH hosts.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-black/60 sm:text-lg">
              Approved homes will appear here as hosts publish their spaces. Start with the destination search, or become one of the first hosts on StayPrimePH.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/search" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#083f35] px-6 font-semibold text-white transition hover:bg-[#062f28]">
                Explore destinations
              </Link>
              <Link href="/register/host" className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/15 px-6 font-semibold transition hover:border-black">
                Become a host
              </Link>
            </div>
          </section>
        )}

      </main>

      <SiteFooter flushTop />
    </div>
  );
}
