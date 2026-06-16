import { defaultMapCenter, hasPropertyCoordinates, resolvePropertyCoordinates } from "@/lib/property-map";
import { calculateGuestPriceWithMarkup } from "@/lib/pricing";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";
import type { Property } from "@/lib/types";

export type SearchMapMarker = {
  id: string;
  title: string;
  location: string;
  label: string;
  coords: [number, number];
  exact: boolean;
};

function markerOffset(index: number) {
  const offsets = [
    [0, 0],
    [0.0014, -0.0012],
    [-0.0011, 0.0013],
    [0.0016, 0.0009],
    [-0.0015, -0.0008],
    [0.0008, 0.0016],
  ];
  return offsets[index % offsets.length];
}

export function getListingMarkers(properties: Property[]): SearchMapMarker[] {
  return properties.slice(0, 18).map((property, index) => {
    const exact = hasPropertyCoordinates(property);
    const base = resolvePropertyCoordinates(property) ?? defaultMapCenter;
    const [latOffset, lngOffset] = exact ? [0, 0] : markerOffset(index);

    return {
      id: property.id,
      title: property.title,
      location: formatPropertyLocation(property),
      label: formatCurrency(calculateGuestPriceWithMarkup(property.pricePerNight)),
      coords: [base[0] + latOffset, base[1] + lngOffset],
      exact,
    };
  });
}
