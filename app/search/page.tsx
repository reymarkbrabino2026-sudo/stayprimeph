import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/public/navbar";
import { SearchBar } from "@/components/public/search-bar";
import { DeferredRealMap } from "@/components/search/deferred-real-map";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchResultCard } from "@/components/search/search-result-card";
import { SearchResultsLayout } from "@/components/search/search-results-layout";
import { getPublicListingSummaries } from "@/lib/properties";
import { formatSearchLocationLabel, getPropertyLocationSearchText, normalizePropertyLocationSearchQuery } from "@/lib/property-location";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Find Vacation Rentals & Staycations in the Philippines",
  description:
    "Search short-term rentals, condo staycations, and private vacation homes across the Philippines. Browse affordable stays near you and book your next getaway.",
  alternates: { canonical: "/search" },
};

type LatLng = { lat: number; lng: number };

function distanceKm(from: LatLng, property: { latitude?: number; longitude?: number }) {
  if (!Number.isFinite(property.latitude) || !Number.isFinite(property.longitude)) return Number.POSITIVE_INFINITY;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(property.latitude! - from.lat);
  const dLng = toRad(property.longitude! - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(property.latitude!)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; guests?: string; type?: string; minPrice?: string; maxPrice?: string; beds?: string; amenities?: string; near?: string }>;
}) {
  const query = await searchParams;
  const approved = await getPublicListingSummaries();
  const requestedGuests = Number(query.guests ?? 0);
  const location = normalizePropertyLocationSearchQuery(query.location);
  const locationLabel = formatSearchLocationLabel(query.location);

  const typeFilter = query.type ?? "";
  const minPrice = Number(query.minPrice ?? "");
  const maxPrice = Number(query.maxPrice ?? "");
  const beds = Number(query.beds ?? "");
  const amenityFilter = (query.amenities ?? "").split(",").map((value) => value.trim()).filter(Boolean);

  const results = approved.filter((property) => {
    const matchesGuests = requestedGuests > 0 ? property.maxGuests >= requestedGuests : true;
    const matchesLocation = location && location !== "search destinations" && location !== "nearby"
      ? getPropertyLocationSearchText(property).includes(location)
      : true;
    const matchesType = typeFilter ? property.propertyType === typeFilter : true;
    const matchesMin = minPrice > 0 ? property.pricePerNight >= minPrice : true;
    const matchesMax = maxPrice > 0 ? property.pricePerNight <= maxPrice : true;
    const matchesBeds = beds > 0 ? property.bedrooms >= beds : true;
    const matchesAmenities = amenityFilter.length ? amenityFilter.every((amenity) => property.amenities.includes(amenity)) : true;
    return matchesGuests && matchesLocation && matchesType && matchesMin && matchesMax && matchesBeds && matchesAmenities;
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

  const nearParts = (query.near ?? "").split(",").map(Number);
  const nearPoint: LatLng | null = nearParts.length === 2 && nearParts.every(Number.isFinite)
    ? { lat: nearParts[0], lng: nearParts[1] }
    : null;
  const orderedResults = nearPoint
    ? [...results].sort((a, b) => distanceKm(nearPoint, a) - distanceKm(nearPoint, b))
    : results;

  return (
    <div className="bg-white">
      <div className="border-b">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 pb-5 pt-4 sm:px-6 md:pt-0">
          <SearchBar />
        </div>
      </div>

      <SearchResultsLayout
        map={<DeferredRealMap properties={orderedResults} location={query.location} />}
        results={
          <>
            <div className="border-b pb-5">
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
            </div>

            <div className="py-6">
              <p className="text-sm text-black/55">{results.length} places available</p>
              <h1 className="mt-1 text-2xl font-semibold">{nearPoint ? "Stays near you" : locationLabel ? `Stays near ${locationLabel}` : "Available stays"}</h1>
            </div>

            {results.length === 0 ? (
              <div className="rounded-[2rem] border border-black/10 bg-[#fbf7f2] p-10 text-center">
                <h2 className="text-xl font-semibold">
                  {locationLabel ? `No stays in ${locationLabel} yet` : "No stays match your search yet"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/55">
                  We&apos;re adding new homes across the Philippines all the time. Try a nearby city, or browse everything available right now.
                </p>
                <Link
                  href="/search"
                  className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#083f35] px-6 text-sm font-semibold text-white transition hover:bg-[#062f28]"
                >
                  Browse all stays
                </Link>
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
