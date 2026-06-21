import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/public/navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { SearchResultCard } from "@/components/search/search-result-card";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { getPublicListingSummaries } from "@/lib/properties";
import { getPropertyLocationSearchText } from "@/lib/property-location";
import { seoLocations, seoLocationBySlug } from "@/lib/seo-locations";

export const revalidate = 300;

export function generateStaticParams() {
  return seoLocations.map((location) => ({ location: location.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ location: string }> }): Promise<Metadata> {
  const { location: slug } = await params;
  const location = seoLocationBySlug.get(slug);
  if (!location) return { title: "Destination not found" };

  return {
    title: location.title,
    description: location.intro,
    alternates: { canonical: `/staycation/${location.slug}` },
    openGraph: {
      title: location.title,
      description: location.intro,
      url: `/staycation/${location.slug}`,
      type: "website",
    },
  };
}

export default async function StaycationLocationPage({ params }: { params: Promise<{ location: string }> }) {
  const { location: slug } = await params;
  const location = seoLocationBySlug.get(slug);
  if (!location) notFound();

  const all = await getPublicListingSummaries();
  const listings = all.filter((property) => getPropertyLocationSearchText(property).includes(location.query));

  const pageUrl = `${env.NEXT_PUBLIC_APP_URL}/staycation/${location.slug}`;
  const breadcrumbItems: Crumb[] = [
    { label: "Philippines", href: "/search" },
    { label: location.name },
  ];

  const collectionLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: location.headline,
    description: location.intro,
    url: pageUrl,
  };
  const breadcrumbLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Philippines", item: `${env.NEXT_PUBLIC_APP_URL}/search` },
      { "@type": "ListItem", position: 2, name: location.name, item: pageUrl },
    ],
  };

  const otherLocations = seoLocations.filter((entry) => entry.slug !== location.slug);

  return (
    <div className="bg-white text-[#1f1b16]">
      <JsonLd data={collectionLd} />
      <JsonLd data={breadcrumbLd} />
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-12">
        <Breadcrumbs items={breadcrumbItems} />

        <header className="mt-5 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">{location.region}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-5xl">{location.headline}</h1>
          <p className="mt-4 text-base leading-7 text-black/65 sm:text-lg">{location.intro}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {location.highlights.map((highlight) => (
              <span key={highlight} className="rounded-full border border-black/10 bg-[#fbf7f2] px-4 py-2 text-sm font-medium text-black/70">
                {highlight}
              </span>
            ))}
          </div>
        </header>

        <section className="mt-10">
          <h2 className="text-xl font-semibold sm:text-2xl">
            {listings.length > 0 ? `${listings.length} stay${listings.length === 1 ? "" : "s"} in ${location.name}` : `Stays in ${location.name}`}
          </h2>
          {listings.length > 0 ? (
            <div className="mt-5 grid gap-x-4 gap-y-9 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {listings.map((property, index) => (
                <SearchResultCard key={property.id} property={property} isAuthenticated={false} priority={index === 0} />
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title={`New ${location.name} stays coming soon`}
                body={`Hosts are publishing homes in ${location.name} now. Check back soon, or explore stays across the Philippines.`}
              />
              <Link href="/search" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#083f35] px-6 font-semibold text-white transition hover:bg-[#062f28]">
                Browse all stays
              </Link>
            </div>
          )}
        </section>

        <section className="mt-16 rounded-[1.75rem] border border-black/10 bg-[#fbf7f2] p-6 sm:p-8">
          <h2 className="text-xl font-semibold sm:text-2xl">Have a property in {location.name}?</h2>
          <p className="mt-2 max-w-2xl text-black/65">
            List your condo, house, or private resort on StayPrime and earn from short-term rentals — a simple, direct-booking
            alternative for hosts in {location.name}.
          </p>
          <Link href="/register?role=host" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 font-semibold text-white transition hover:bg-black/85">
            List your property
          </Link>
        </section>

        <nav aria-label="Other destinations" className="mt-16">
          <h2 className="text-xl font-semibold sm:text-2xl">Explore more destinations</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {otherLocations.map((entry) => (
              <Link
                key={entry.slug}
                href={`/staycation/${entry.slug}`}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black/70 transition hover:border-black/30 hover:bg-black/[0.03]"
              >
                {entry.name} staycations
              </Link>
            ))}
          </div>
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
}
