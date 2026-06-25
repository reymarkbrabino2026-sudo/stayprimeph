import { HomeHeroSlider } from "@/components/home/home-hero-slider";
import { PropertyRail } from "@/components/home/property-rail";
import { RecentSearchCard } from "@/components/home/recent-search-card";
import { SiteFooter } from "@/components/home/site-footer";
import { HomeHeader } from "@/components/public/home-header";
import Link from "next/link";
import { buildHomePropertyRails } from "@/lib/home-properties";
import { getPublicListingSummaries } from "@/lib/properties";

// Render at runtime (against the database) instead of baking the build-time
// empty data store into the static page. The listing query itself is still
// cached for 60s via getPublicListingSummaries, so this stays fast.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const properties = await getPublicListingSummaries();
  const propertyRails = buildHomePropertyRails(properties);

  return (
    <div className="bg-white">
      <HomeHeader />

      <HomeHeroSlider />

      <main className="w-full space-y-8 px-6 pb-24 pt-6 sm:px-6 md:space-y-10 md:px-6 md:pb-12 md:pt-12 lg:px-9 2xl:px-10">
        <RecentSearchCard />
        {propertyRails.length > 0 ? (
          propertyRails.map((rail) => (
            <PropertyRail key={rail.title} title={rail.title} items={rail.items} isAuthenticated={false} />
          ))
        ) : (
          <section className="mx-auto flex min-h-64 max-w-3xl flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">Real listings coming soon</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#083f35] sm:text-5xl">
              Discover stays hosted by real StayPrimePH hosts.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-black/60 sm:text-lg">
              Approved homes will appear here as hosts publish their spaces. Start with the destination search, or become one of the first hosts on StayPrimePH.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/search" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#083f35] px-6 font-semibold text-white transition hover:bg-[#062f28]">
                Explore destinations
              </Link>
              <Link href="/register?role=host" className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/15 px-6 font-semibold transition hover:border-black">
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
