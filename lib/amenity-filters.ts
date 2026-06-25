export type QuickAmenityFilter = {
  label: string;
  aliases: string[];
};

export const quickAmenityFilters: QuickAmenityFilter[] = [
  { label: "Washer", aliases: ["Washer"] },
  { label: "Wifi", aliases: ["WiFi", "Wifi", "Wi-Fi"] },
  { label: "Free parking", aliases: ["Free parking", "Parking space"] },
  { label: "Allows pets", aliases: ["Allows pets", "Pet friendly", "Pets allowed"] },
  { label: "Air con", aliases: ["Fully airconditioned", "Air conditioning", "Aircon", "Air conditioned"] },
];

export function normalizeAmenityLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function resolveAmenityFilterValue(availableAmenities: string[], filter: QuickAmenityFilter) {
  const availableByNormalized = new Map(
    availableAmenities.map((amenity) => [normalizeAmenityLabel(amenity), amenity] as const),
  );

  for (const alias of filter.aliases) {
    const available = availableByNormalized.get(normalizeAmenityLabel(alias));
    if (available) return available;
  }

  return filter.aliases[0];
}

export function propertyMatchesAmenityFilter(propertyAmenities: string[], requestedAmenity: string) {
  const requested = normalizeAmenityLabel(requestedAmenity);
  const quickFilter = quickAmenityFilters.find((filter) =>
    filter.aliases.some((alias) => normalizeAmenityLabel(alias) === requested),
  );
  const accepted = new Set([requested]);
  quickFilter?.aliases.forEach((alias) => accepted.add(normalizeAmenityLabel(alias)));

  return propertyAmenities.some((amenity) => accepted.has(normalizeAmenityLabel(amenity)));
}
