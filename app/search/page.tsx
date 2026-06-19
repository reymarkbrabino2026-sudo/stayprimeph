import { Navbar } from "@/components/public/navbar";
import { SearchBar } from "@/components/public/search-bar";
import { DeferredRealMap } from "@/components/search/deferred-real-map";
import { SearchResultCard } from "@/components/search/search-result-card";
import { getPublicListingSummaries } from "@/lib/properties";
import { formatSearchLocationLabel, getPropertyLocationSearchText, normalizePropertyLocationSearchQuery } from "@/lib/property-location";

export const revalidate = 60;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; guests?: string }>;
}) {
  const query = await searchParams;
  const approved = await getPublicListingSummaries();
  const requestedGuests = Number(query.guests ?? 0);
  const location = normalizePropertyLocationSearchQuery(query.location);
  const locationLabel = formatSearchLocationLabel(query.location);
  const results = approved.filter((property) => {
    const matchesGuests = requestedGuests > 0 ? property.maxGuests >= requestedGuests : true;
    const matchesLocation = location && location !== "search destinations"
      ? getPropertyLocationSearchText(property).includes(location)
      : true;
    return matchesGuests && matchesLocation;
  });

  return (
    <div className="bg-white">
      <div className="border-b">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 pb-5 pt-4 sm:px-6 md:pt-0">
          <SearchBar />
        </div>
      </div>

      <main className="grid min-w-0 min-h-[calc(100vh-150px)] pb-24 md:pb-0 lg:grid-cols-2">
        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <div className="no-scrollbar touch-scroll flex min-w-0 gap-2 overflow-x-auto border-b pb-5">
            {["Filters", "Price", "Type of place", "Rooms and beds", "Amenities", "Booking options"].map((item) => (
              <button key={item} className="min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition active:border-black md:hover:border-black">
                {item}
              </button>
            ))}
          </div>

          <div className="py-6">
            <p className="text-sm text-black/55">{results.length} places available</p>
            <h1 className="mt-1 text-2xl font-semibold">{locationLabel ? `Stays near ${locationLabel}` : "Available stays"}</h1>
          </div>

          <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
            {results.map((property, index) => (
              <SearchResultCard key={property.id} property={property} isAuthenticated={false} priority={index < 2} />
            ))}
          </div>
        </section>

        <aside className="hidden border-l lg:block">
          <div className="sticky top-0 h-screen p-6">
            <DeferredRealMap properties={results} location={query.location} />
          </div>
        </aside>
      </main>
    </div>
  );
}
