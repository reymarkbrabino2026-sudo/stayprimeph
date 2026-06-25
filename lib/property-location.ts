import type { Property } from "@/lib/types";

type LocationFields = Pick<Property, "city" | "country"> & Partial<Pick<Property, "address" | "barangay" | "province" | "zipCode">>;

function cleanPart(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function formatPropertyLocation(property: LocationFields) {
  const city = cleanPart(property.city);

  return city || cleanPart(property.country);
}

export function normalizePropertyLocationSearchQuery(value?: string) {
  return cleanPart(value)
    .toLowerCase()
    .replace(/\bsta[.]?\b/g, "santa")
    .replace(/\s*,\s*/g, " ")
    .replace(/\bphilippines\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatSearchLocationLabel(value?: string) {
  const location = cleanPart(value);
  const normalized = normalizePropertyLocationSearchQuery(location);

  if (!location || normalized === "search destinations" || normalized === "nearby") return "";

  const withoutCountry = location.replace(/\s*,?\s*philippines\s*$/i, "").trim();
  return withoutCountry.split(",").map(cleanPart).find(Boolean) ?? "";
}

export function getPropertyLocationSearchText(property: LocationFields) {
  return normalizePropertyLocationSearchQuery(
    [property.address, property.barangay, property.city, property.province, property.zipCode, property.country, formatPropertyLocation(property)]
      .map(cleanPart)
      .filter(Boolean)
      .join(" "),
  );
}

function withoutCitySuffix(value: string) {
  return value.replace(/\s+city$/i, "").trim();
}

function normalizedLocationParts(property: LocationFields) {
  return [property.barangay, property.city, property.province, property.zipCode, property.country, formatPropertyLocation(property)]
    .map(normalizePropertyLocationSearchQuery)
    .filter(Boolean);
}

export function propertyMatchesLocationSearch(property: LocationFields, value?: string) {
  const location = normalizePropertyLocationSearchQuery(value);
  if (!location || location === "search destinations" || location === "nearby") return true;

  const locationWithoutCity = withoutCitySuffix(location);
  const structuredParts = normalizedLocationParts(property);
  const structuredAliases = structuredParts.flatMap((part) => [part, withoutCitySuffix(part)]);

  if (structuredAliases.some((part) => part === location || part === locationWithoutCity)) return true;

  const normalizedAddress = normalizePropertyLocationSearchQuery(property.address);
  return location.includes(" ") && normalizedAddress.includes(location);
}
