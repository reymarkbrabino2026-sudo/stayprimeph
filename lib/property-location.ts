import type { Property } from "@/lib/types";

type LocationFields = Pick<Property, "city" | "country"> & Partial<Pick<Property, "address" | "barangay" | "province" | "zipCode">>;

function cleanPart(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function formatPropertyLocation(property: LocationFields) {
  const city = cleanPart(property.city);
  const province = cleanPart(property.province);

  if (city && province) return `${city}, ${province}`;
  if (city.toLowerCase() === "sta maria") return "Sta Maria, Davao Occidental";
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
  if (normalized === "sta maria") return "Sta Maria, Davao Occidental";

  return location.replace(/\s*,?\s*philippines\s*$/i, "").trim();
}

export function getPropertyLocationSearchText(property: LocationFields) {
  return normalizePropertyLocationSearchQuery(
    [property.address, property.barangay, property.city, property.province, property.zipCode, property.country, formatPropertyLocation(property)]
      .map(cleanPart)
      .filter(Boolean)
      .join(" "),
  );
}
