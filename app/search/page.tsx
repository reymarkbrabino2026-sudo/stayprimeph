import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/public/navbar";
import { PublicBottomNav } from "@/components/public/public-bottom-nav";
import { SearchBar } from "@/components/public/search-bar";
import { DeferredRealMap } from "@/components/search/deferred-real-map";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchResultCard } from "@/components/search/search-result-card";
import { SearchResultsLayout } from "@/components/search/search-results-layout";
import { getPublicListingSummaries } from "@/lib/properties";
import { formatSearchLocationLabel, normalizePropertyLocationSearchQuery, propertyMatchesLocationSearch } from "@/lib/property-location";
import { resolvePropertyCoordinates } from "@/lib/property-map";
import type { PublicListingSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Find Vacation Rentals & Staycations in the Philippines",
  description:
    "Search short-term rentals, condo staycations, and private vacation homes across the Philippines. Browse affordable stays near you and book your next getaway.",
  alternates: { canonical: "/search" },
};

type LatLng = { lat: number; lng: number };
const NEARBY_RADIUS_KM = 75;

function distanceKm(from: LatLng, property: PublicListingSummary) {
  const coords = resolvePropertyCoordinates(property);
  if (!coords) return Number.POSITIVE_INFINITY;
  const [lat, lng] = coords;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat - from.lat);
  const dLng = toRad(lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; guests?: string; checkIn?: string; checkOut?: string; type?: string; minPrice?: string; maxPrice?: string; beds?: string; amenities?: string; near?: string }>;
}) {
  const query = await searchParams;
  const approved = await getPublicListingSummaries();
  const requestedGuests = Number(query.guests ?? 0);

  const stayRange = query.checkIn && query.checkOut
    ? `${new Date(`${query.checkIn}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(`${query.checkOut}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "";
  const mapMetaLabel = [stayRange, requestedGuests > 0 ? `${requestedGuests} guest${requestedGuests === 1 ? "" : "s"}` : ""].filter(Boolean).join(" | ");
  const location = normalizePropertyLocationSearchQuery(query.location);
  const locationLabel = formatSearchLocationLabel(query.location);
  const requestedNearby = location === "nearby" || Boolean(query.near);
  const nearParts = (query.near ?? "").split(",").map(Number);
  const nearPoint: LatLng | null = nearParts.length === 2 && nearParts.every(Number.isFinite)
    ? { lat: nearParts[0], lng: nearParts[1] }
    : null;

  const typeFilter = query.type ?? "";
  const minPrice = Number(query.minPrice ?? "");
  const maxPrice = Number(query.maxPrice ?? "");
  const beds = Number(query.beds ?? "");
  const amenityFilter = (query.amenities ?? "").split(",").map((value) => value.trim()).filter(Boolean);

  const results = approved.filter((property) => {
    const matchesGuests = requestedGuests > 0 ? property.maxGuests >= requestedGuests : true;
    const matchesLocation = requestedNearby ? true : propertyMatchesLocationSearch(property, query.location);
    const matchesNearby = requestedNearby ? (nearPoint ? distanceKm(nearPoint, property) <= NEARBY_RADIUS_KM : false) : true;
    const matchesType = typeFilter ? property.propertyType === typeFilter : true;
    const matchesMin = minPrice > 0 ? property.pricePerNight >= minPrice : true;
    const matchesMax = maxPrice > 0 ? property.pricePerNight <= maxPrice : true;
    const matchesBeds = beds > 0 ? property.bedrooms >= beds : true;
    const matchesAmenities = amenityFilter.length ? amenityFilter.every((amenity) => property.amenities.includes(amenity)) : true;
    return matchesGuests && matchesLocation && matchesNearby && matchesType && matchesMin && matchesMax && matchesBeds && matchesAmenities;
  });

  const typeLabels: Record<string, string> = {
    house: "House", villa: "Villa", resort: "Resort", apartment: "Apartment", condo: "Condo",
    cabin: "Cabin", "tiny-home": "Tiny home", hotel: "Hotel", farm: "Farm", guesthouse: "Guesthouse",
  };
  const availableTypes = Array.from(new Set(approved.map((property) => property.propertyType)))
    .filter(Boolean)
    .sort()
    .map((value) => ({ value, label: typeLabels[value] ?? value.charAt(0).toUpperCase() + value.slice(1) }));
  const availableAmenities = Array.from(new Set(approved.flatMap((property) => property.amenities))).sort();

  const orderedResults = nearPoint
    ? [...results].sort((a, b) => distanceKm(nearPoint, a) - distanceKm(nearPoint, b))
    : results;
  const resultsTitle = requestedNearby ? "Stays near you" : locationLabel ? `Stays in ${locationLabel}` : "Available stays";
  const filters = (
    <SearchFilters
      types={availableTypes}
      amenities={availableAmenities}
      current={{
        type: typeFilter,
        minPrice: query.minPrice ?? "",
        maxPrice: query.maxPrice ?? "",
        beds: query.beds ?? "",
        amenities: amenityFilter,
      }}
    />
  );
  const selectedTypeLabel = typeFilter ? availableTypes.find((type) => type.value === typeFilter)?.label ?? typeFilter : "";
  const priceFilterLabel =
    minPrice > 0 && maxPrice > 0
      ? `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`
      : minPrice > 0
        ? `From ${formatCurrency(minPrice)}`
        : maxPrice > 0
          ? `Up to ${formatCurrency(maxPrice)}`
          : "";
  const activeFilterLabels = [
    selectedTypeLabel,
    priceFilterLabel,
    beds > 0 ? `${beds}+ bedrooms` : "",
    amenityFilter.length ? `${amenityFilter.length} amenity${amenityFilter.length === 1 ? "" : "ies"}` : "",
  ].filter(Boolean);
  const clearFilterParams = new URLSearchParams();
  for (const key of ["location", "guests", "checkIn", "checkOut", "near"] as const) {
    const value = query[key];
    if (value) clearFilterParams.set(key, value);
  }
  const clearFiltersHref = `/search${clearFilterParams.toString() ? `?${clearFilterParams.toString()}` : ""}`;

  return (
    <div className="bg-white">
      <div className="hidden border-b lg:block">
        <Navbar hideBottomNav />
        <div className="mx-auto max-w-4xl px-4 pb-5 pt-6 sm:px-6">
          <SearchBar />
        </div>
      </div>
      <PublicBottomNav />

      <SearchResultsLayout
        metaLabel={mapMetaLabel}
        title={resultsTitle}
        count={results.length}
        filters={filters}
        map={<DeferredRealMap properties={orderedResults} location={query.location} near={query.near} />}
        mobileSearch={<SearchBar variant="mobile" />}
        results={
          <>
            <div className="py-6 lg:py-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-black/55">
                    {results.length} {results.length === 1 ? "place" : "places"} available{mapMetaLabel ? ` | ${mapMetaLabel}` : ""}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-[-0.01em]">{resultsTitle}</h1>
                </div>
                {activeFilterLabels.length > 0 ? (
                  <Link
                    href={clearFiltersHref}
                    className="inline-flex min-h-10 w-fit items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold transition hover:border-black/30 hover:bg-black/[0.03]"
                  >
                    Clear filters
                  </Link>
                ) : null}
              </div>
              {activeFilterLabels.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeFilterLabels.map((label) => (
                    <span key={label} className="rounded-full bg-[#eef4ef] px-3 py-1 text-sm font-medium text-[#083f35]">
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {results.length === 0 ? (
              <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf7f2] p-8 text-center sm:p-10">
                <h2 className="text-xl font-semibold">
                  {requestedNearby ? "No nearby stays yet" : locationLabel ? `No stays in ${locationLabel} yet` : "No stays match your search yet"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/55">
                  {requestedNearby && !nearPoint
                    ? "Allow location access and search Nearby again so we can find homes around your current area."
                    : activeFilterLabels.length > 0
                    ? "Try widening the price, bedroom, or amenity filters. New homes are being added across the Philippines regularly."
                    : "New homes are being added across the Philippines regularly. Browse again soon or try a specific destination."}
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  {activeFilterLabels.length > 0 ? (
                    <Link
                      href={clearFiltersHref}
                      className="inline-flex min-h-11 items-center rounded-full bg-[#083f35] px-6 text-sm font-semibold text-white transition hover:bg-[#062f28]"
                    >
                      Clear filters
                    </Link>
                  ) : null}
                  <Link
                    href="/search"
                    className="inline-flex min-h-11 items-center rounded-full border border-black/10 px-6 text-sm font-semibold transition hover:border-black/30 hover:bg-white"
                  >
                    Browse all stays
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 xl:grid-cols-2">
                {orderedResults.map((property, index) => (
                  <SearchResultCard key={property.id} property={property} isAuthenticated={false} priority={index < 2} />
                ))}
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
