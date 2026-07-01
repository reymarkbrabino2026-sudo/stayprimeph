import { propertyTypes } from "@/lib/host-wizard-data";

const resortTypeIds = new Set(["resort", "private-resort"]);

function normalizePropertyTypeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getPropertyTypeOption(value?: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const normalized = normalizePropertyTypeKey(trimmed);
  return propertyTypes.find((item) => item.id === trimmed || item.id === normalized || normalizePropertyTypeKey(item.label) === normalized);
}

export function getPropertyTypeId(value?: string | null, fallback = "house") {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return getPropertyTypeOption(trimmed)?.id ?? trimmed;
}

export function getPropertyTypeLabel(value?: string | null, fallback = "Stay") {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return getPropertyTypeOption(trimmed)?.label ?? titleCase(trimmed);
}

export function getPropertyTypeIconName(value?: string | null, fallback = "house") {
  return getPropertyTypeOption(value)?.icon ?? fallback;
}

export function propertyTypeMatches(value: string | null | undefined, filter: string | null | undefined) {
  const listingTypeId = getPropertyTypeId(value, "");
  const filterTypeId = getPropertyTypeId(filter, "");
  if (!filterTypeId) return true;
  if (resortTypeIds.has(filterTypeId)) return resortTypeIds.has(listingTypeId);
  return listingTypeId === filterTypeId;
}
