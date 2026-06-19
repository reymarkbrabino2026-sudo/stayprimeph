import type { Property, PublicListingSummary } from "@/lib/types";

export type Coordinates = [number, number];

export const defaultMapCenter: Coordinates = [14.5995, 120.9842];
export const defaultMapCenterLabel = "Manila, Philippines";

const cityCoordinates: Record<string, Coordinates> = {
  baguio: [16.4023, 120.596],
  bacolod: [10.6765, 122.9509],
  butuan: [8.9475, 125.5406],
  "cagayan de oro": [8.4542, 124.6319],
  "cebu city": [10.3157, 123.8854],
  coron: [11.9986, 120.2043],
  "davao city": [7.1907, 125.4553],
  dumaguete: [9.3068, 123.3054],
  "general santos": [6.1164, 125.1716],
  iligan: [8.228, 124.2452],
  "iloilo city": [10.7202, 122.5621],
  laoag: [18.196, 120.5927],
  "lapu-lapu city": [10.3103, 123.9494],
  makati: [14.5547, 121.0244],
  manila: [14.5995, 120.9842],
  siargao: [9.8482, 126.0458],
  "santa maria": [14.8183, 120.9563],
  "sta maria": [14.8183, 120.9563],
  tacloban: [11.2543, 125.0039],
  tagaytay: [14.1153, 120.9623],
  vigan: [17.5747, 120.3869],
  "zamboanga city": [6.9214, 122.079],
};

const knownPlaceCoordinates: Array<{ includes: string[]; coords: Coordinates }> = [
  { includes: ["mamacao", "santa maria", "davao occidental"], coords: [6.5801, 125.4574] },
  { includes: ["sta maria", "davao occidental"], coords: [6.5537, 125.4742] },
  { includes: ["santa maria", "davao occidental"], coords: [6.5537, 125.4742] },
];

function normalizePlace(value: string) {
  return value
    .toLowerCase()
    .replace(/\bsta[.]?\b/g, "santa")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasPropertyCoordinates(property: Pick<Property, "latitude" | "longitude">) {
  return Number.isFinite(property.latitude) && Number.isFinite(property.longitude);
}

export function resolveLocationCoordinates(location?: string) {
  if (!location) return null;

  const normalized = normalizePlace(location.replace(/,\s*philippines$/i, ""));
  const knownPlace = knownPlaceCoordinates.find((place) =>
    place.includes.every((part) => normalized.includes(normalizePlace(part))),
  );
  if (knownPlace) return knownPlace.coords;

  return cityCoordinates[normalized] ?? null;
}

export function resolvePropertyCoordinates(property: Property | PublicListingSummary): Coordinates | null {
  if (hasPropertyCoordinates(property)) return [property.latitude!, property.longitude!];

  const fullLocation = [
    property.address,
    property.barangay,
    property.city,
    property.province,
    property.zipCode,
    property.country,
  ].filter(Boolean).join(", ");

  return resolveLocationCoordinates(fullLocation) ?? resolveLocationCoordinates(property.city);
}
