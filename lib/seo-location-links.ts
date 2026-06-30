import { seoLocations } from "@/lib/seo-locations";

const slugByNormalizedLocation = new Map(
  seoLocations.flatMap((location) => {
    const normalizedName = normalizeLocationName(location.name);
    return [
      [normalizedName, location.slug],
      [normalizeLocationName(location.slug), location.slug],
    ];
  }),
);

const locationAliases = new Map<string, string>([
  ["cebu city", "cebu"],
  ["davao city", "davao"],
  ["metro manila", "manila"],
]);

function normalizeLocationName(value: string) {
  return value
    .toLowerCase()
    .replace(/,\s*philippines$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function staycationSlugForLocation(location: string) {
  const normalized = normalizeLocationName(location);
  const aliased = locationAliases.get(normalized) ?? normalized;
  return slugByNormalizedLocation.get(aliased) ?? null;
}

export function staycationHrefForLocation(location: string) {
  const slug = staycationSlugForLocation(location);
  return slug ? `/staycation/${slug}` : null;
}

export function destinationHrefForLocation(location: string) {
  return staycationHrefForLocation(location) ?? "/search";
}
