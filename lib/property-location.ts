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
    .replace(/\s*,\s*/g, " ")
    .replace(/\bphilippines\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatSearchLocationLabel(value?: string) {
  const location = cleanPart(value);
  const normalized = normalizePropertyLocationSearchQuery(location);

  if (!location || normalized === "search destinations") return "";

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
