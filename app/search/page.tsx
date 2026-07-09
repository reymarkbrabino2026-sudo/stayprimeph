import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "lucide-react";
import { PublicBottomNav } from "@/components/public/public-bottom-nav";
import { SearchBar } from "@/components/public/search-bar";
import { DeferredRealMap } from "@/components/search/deferred-real-map";
import { SearchPageHeader } from "@/components/search/search-page-header";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchResultCard } from "@/components/search/search-result-card";
import { SearchResultsLayout } from "@/components/search/search-results-layout";
import { JsonLd } from "@/components/seo/json-ld";
import { propertyMatchesAmenityFilter } from "@/lib/amenity-filters";
import { env } from "@/lib/env";
import { getPublicListingSummaries } from "@/lib/properties";
import { getPropertyTypeId, getPropertyTypeLabel, propertyTypeMatches } from "@/lib/property-types";
import { formatSearchLocationLabel, normalizePropertyLocationSearchQuery, propertyMatchesLocationSearch } from "@/lib/property-location";
import { resolvePropertyCoordinates } from "@/lib/property-map";
import type { PublicListingSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 60;

type SearchPageParams = {
  location?: string;
  guests?: string;
  checkIn?: string;
  checkOut?: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  beds?: string;
  amenities?: string;
  near?: string;
};

type LatLng = { lat: number; lng: number };
const NEARBY_RADIUS_KM = 75;

function hasSearchFilters(query: SearchPageParams) {
  return Object.values(query).some((value) => Boolean(value?.trim()));
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchPageParams>;
}): Promise<Metadata> {
  const query = await searchParams;
  const location = normalizePropertyLocationSearchQuery(query.location);
  const locationLabel = formatSearchLocationLabel(query.location);
  const requestedNearby = location === "nearby" || Boolean(query.near);
  const filtered = hasSearchFilters(query);
  const title = locationLabel && !requestedNearby
    ? `${locationLabel} Vacation Rentals & Staycations`
    : "Find Vacation Rentals & Staycations in the Philippines";
  const description = locationLabel && !requestedNearby
    ? `Search staycations, short-term rentals, condos, and private homes in ${locationLabel}. Compare prices, amenities, and available stays on StayPrime PH.`
    : "Search short-term rentals, condo staycations, and private vacation homes across the Philippines. Browse affordable stays near you and book your next getaway.";

  return {
    title,
    description,
    alternates: { canonical: "/search" },
    robots: {
      index: !filtered,
      follow: true,
      googleBot: {
        index: !filtered,
        follow: true,
      },
    },
    openGraph: {
      title,
      description,
      url: `${env.NEXT_PUBLIC_APP_URL}/search`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function parseQueryDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCompactDate(date: Date, includeYear = false) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" as const } : {}),
  });
}

function formatCompactStayDates(checkInValue?: string, checkOutValue?: string) {
  const checkIn = parseQueryDate(checkInValue);
  const checkOut = parseQueryDate(checkOutValue);
  if (!checkIn) return "Any week";
  if (!checkOut) return formatCompactDate(checkIn);
  const sameMonth = checkIn.getFullYear() === checkOut.getFullYear() && checkIn.getMonth() === checkOut.getMonth();
  if (sameMonth) return `${formatCompactDate(checkIn)} - ${checkOut.getDate()}`;
  const includeYear = checkIn.getFullYear() !== checkOut.getFullYear();
  return `${formatCompactDate(checkIn, includeYear)} - ${formatCompactDate(checkOut, includeYear)}`;
}

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
  searchParams: Promise<SearchPageParams>;
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

  const typeFilter = getPropertyTypeId(query.type, "");
  const minPrice = Number(query.minPrice ?? "");
  const maxPrice = Number(query.maxPrice ?? "");
  const beds = Number(query.beds ?? "");
  const amenityFilter = (query.amenities ?? "").split(",").map((value) => value.trim()).filter(Boolean);

  const results = approved.filter((property) => {
    const matchesGuests = requestedGuests > 0 ? property.maxGuests >= requestedGuests : true;
    const matchesLocation = requestedNearby ? true : propertyMatchesLocationSearch(property, query.location);
    const matchesNearby = requestedNearby ? (nearPoint ? distanceKm(nearPoint, property) <= NEARBY_RADIUS_KM : false) : true;
    const matchesType = typeFilter ? propertyTypeMatches(property.propertyType, typeFilter) : true;
    const matchesMin = minPrice > 0 ? property.pricePerNight >= minPrice : true;
    const matchesMax = maxPrice > 0 ? property.pricePerNight <= maxPrice : true;
    const matchesBeds = beds > 0 ? property.bedrooms >= beds : true;
    const matchesAmenities = amenityFilter.length ? amenityFilter.every((amenity) => propertyMatchesAmenityFilter(property.amenities, amenity)) : true;
    return matchesGuests && matchesLocation && matchesNearby && matchesType && matchesMin && matchesMax && matchesBeds && matchesAmenities;
  });

  const availableTypes = Array.from(new Map(
    approved
      .map((property) => getPropertyTypeId(property.propertyType, ""))
      .filter(Boolean)
      .map((value) => [value, getPropertyTypeLabel(value)]),
  ))
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([value, label]) => ({ value, label }));
  const availableAmenities = Array.from(new Set(approved.flatMap((property) => property.amenities))).sort();

  const orderedResults = nearPoint
    ? [...results].sort((a, b) => distanceKm(nearPoint, a) - distanceKm(nearPoint, b))
    : results;
  const resultsTitle = requestedNearby ? "Stays near you" : locationLabel ? `Stays in ${locationLabel}` : "Available stays";
  const compactSearchSummary = {
    location: locationLabel && !requestedNearby ? `Homes in ${locationLabel}` : "Homes in map area",
    dates: formatCompactStayDates(query.checkIn, query.checkOut),
    guests: requestedGuests > 0 ? `${requestedGuests} guest${requestedGuests === 1 ? "" : "s"}` : "Add guests",
  };
  const homesWithinMapAreaLabel = results.length > 1000
    ? `Over ${results.length.toLocaleString("en-US")} homes within map area`
    : `${results.length.toLocaleString("en-US")} ${results.length === 1 ? "home" : "homes"} within map area`;
  const resultContextLabel = [
    requestedNearby ? "Nearby" : locationLabel,
    mapMetaLabel,
  ].filter(Boolean).join(" | ");
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
  const searchPageUrl = `${env.NEXT_PUBLIC_APP_URL}/search`;
  const collectionLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: resultsTitle,
    description: locationLabel && !requestedNearby
      ? `StayPrime PH search results for vacation rentals and staycations in ${locationLabel}.`
      : "StayPrime PH search results for vacation rentals and staycations in the Philippines.",
    url: searchPageUrl,
  };
  const itemListLd: Record<string, unknown> | null = orderedResults.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: resultsTitle,
        numberOfItems: orderedResults.length,
        itemListElement: orderedResults.slice(0, 24).map((property, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: property.title,
          url: `${env.NEXT_PUBLIC_APP_URL}/rooms/${property.id}`,
        })),
      }
    : null;

  return (
    <div className="bg-white lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
      <JsonLd data={collectionLd} />
      {itemListLd ? <JsonLd data={itemListLd} /> : null}
      <SearchPageHeader
        summary={compactSearchSummary}
        filters={{
          types: availableTypes,
          amenities: availableAmenities,
          current: {
            type: typeFilter,
            minPrice: query.minPrice ?? "",
            maxPrice: query.maxPrice ?? "",
            beds: query.beds ?? "",
            amenities: amenityFilter,
          },
        }}
      />
      <PublicBottomNav />

      <SearchResultsLayout
        metaLabel={mapMetaLabel}
        title={resultsTitle}
        count={results.length}
        filters={filters}
        showDesktopFilters={false}
        map={<DeferredRealMap properties={orderedResults} location={query.location} near={query.near} />}
        mobileSearch={<SearchBar variant="mobile" />}
        results={
          <>
            <div className="py-6 lg:py-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  {resultContextLabel ? <p className="text-sm font-medium text-black/55">{resultContextLabel}</p> : null}
                  <h1 className="mt-1 text-2xl font-semibold tracking-normal">{homesWithinMapAreaLabel}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-1 text-sm font-semibold text-black/80">
                    <span className="grid size-9 place-items-center rounded-full bg-[#e8f4ef] text-[#083f35]">
                      <Tag size={18} fill="currentColor" strokeWidth={1.8} />
                    </span>
                    Prices include all fees
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
                  <SearchResultCard
                    key={property.id}
                    property={property}
                    isAuthenticated={false}
                    priority={index < 2}
                    checkIn={query.checkIn}
                    checkOut={query.checkOut}
                  />
                ))}
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
