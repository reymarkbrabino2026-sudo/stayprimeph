'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Star, X } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import { CardImageCarousel } from "@/components/search/card-image-carousel";
import { defaultMapCenter, resolveLocationCoordinates } from "@/lib/property-map";
import { getListingMarkers } from "@/lib/search-map";
import { calculateGuestPriceWithMarkup } from "@/lib/pricing";
import type { PublicListingSummary } from "@/lib/types";
import { formatPropertyLocation, formatSearchLocationLabel, normalizePropertyLocationSearchQuery } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";

function averageCoordinates(markers: Array<{ coords: [number, number] }>) {
  if (markers.length === 0) return null;
  const [lat, lng] = markers.reduce(
    ([latSum, lngSum], marker) => [latSum + marker.coords[0], lngSum + marker.coords[1]],
    [0, 0],
  );
  return [lat / markers.length, lng / markers.length] as [number, number];
}

function normalizeLocation(location?: string) {
  return normalizePropertyLocationSearchQuery(location);
}

function getDestinationMarker(location: string | undefined, markers: Array<{ coords: [number, number] }>) {
  const normalized = normalizeLocation(location);
  if (!normalized || normalized === "search destinations") return null;
  const coords = resolveLocationCoordinates(location) ?? averageCoordinates(markers);
  if (!coords) return null;
  return {
    title: formatSearchLocationLabel(location) || normalized,
    coords,
  };
}

export function RealMap({ properties, location }: { properties: PublicListingSummary[]; location?: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const markers = useMemo(() => getListingMarkers(properties), [properties]);
  const destinationMarker = useMemo(() => getDestinationMarker(location, markers), [location, markers]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedId) ?? null,
    [properties, selectedId],
  );

  useEffect(() => {
    let active = true;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let resizeObserver: ResizeObserver | null = null;

    function invalidateMapSize() {
      requestAnimationFrame(() => {
        leafletMapRef.current?.invalidateSize();
      });
    }

    async function setupMap() {
      if (!mapRef.current || leafletMapRef.current) return;

      const L = await import("leaflet");
      if (!active || !mapRef.current) return;

      const initialCenter = destinationMarker?.coords ?? markers[0]?.coords ?? defaultMapCenter;
      const map = L.map(mapRef.current, {
        center: initialCenter,
        zoom: destinationMarker ? 12 : 10,
        zoomControl: false,
      });
      if (window.matchMedia("(min-width: 1024px)").matches) {
        L.control.zoom({ position: "topright" }).addTo(map);
      }
      map.on("click", () => setSelectedId(null));

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: "abc",
        errorTileUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      }).addTo(map);

      markers.forEach((marker) => {
        const icon = L.divIcon({
          className: "stayprimeph-price-marker",
          html: `<div class="map-price-pill" style="display:inline-flex;align-items:center;justify-content:center;min-width:64px;border-radius:9999px;background:#fff;padding:0.6rem 0.9rem;color:#1f1b16;text-align:center;font-size:0.875rem;font-weight:600;line-height:1;white-space:nowrap;box-shadow:0 10px 25px rgb(0 0 0 / 0.18);transform:translate(-50%, -50%);">${marker.label}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        // Tapping a price pill surfaces the listing card at the bottom of the map.
        L.marker(marker.coords, { icon, zIndexOffset: 1000, riseOnHover: true })
          .addTo(map)
          .on("click", () => setSelectedId(marker.id));
      });

      if (destinationMarker) {
        const destinationIcon = L.divIcon({
          className: "",
          html: `<div class="grid size-7 place-items-center rounded-full bg-[#083f35]/85 text-white shadow ring-2 ring-white"><span class="size-2 rounded-full bg-white"></span></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        // Sits behind the price pills so it never covers a listing's price.
        L.marker(destinationMarker.coords, { icon: destinationIcon, zIndexOffset: -1000 })
          .addTo(map)
          .bindPopup(`<strong>${destinationMarker.title}</strong>`);
      }

      leafletMapRef.current = map;
      if (markers.length > 1) {
        map.fitBounds(markers.map((marker) => marker.coords), {
          maxZoom: 11,
          padding: [54, 54],
        });
      } else if (markers[0]) {
        map.setView(markers[0].coords, 12);
      } else if (destinationMarker) {
        map.setView(destinationMarker.coords, 12);
      }

      invalidateMapSize();
      timeoutIds.push(setTimeout(invalidateMapSize, 250));
      timeoutIds.push(setTimeout(invalidateMapSize, 750));

      resizeObserver = new ResizeObserver(invalidateMapSize);
      resizeObserver.observe(mapRef.current);
    }

    setupMap();

    return () => {
      active = false;
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
      resizeObserver?.disconnect();
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
  }, [markers, destinationMarker]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-none bg-[#e9f0ea] lg:rounded-[2rem]">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0_42%,rgb(255_255_255_/_0.55)_42%_44%,transparent_44%_100%),linear-gradient(25deg,transparent_0_52%,rgb(255_255_255_/_0.5)_52%_54%,transparent_54%_100%),radial-gradient(circle_at_28%_30%,rgb(76_156_111_/_0.32),transparent_16%),radial-gradient(circle_at_70%_58%,rgb(33_150_180_/_0.24),transparent_18%),radial-gradient(circle_at_44%_76%,rgb(232_190_93_/_0.26),transparent_13%)]" />
      <div ref={mapRef} data-lenis-prevent className="relative z-10 h-full w-full" />

      {selectedProperty ? (
        <div className="absolute inset-x-0 bottom-0 z-[600] p-3">
          <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-full bg-white text-black/70 shadow-md transition active:scale-95"
            >
              <X size={16} />
            </button>
            <Link
              href={`/rooms/${selectedProperty.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="relative aspect-[1.7/1] overflow-hidden bg-stone-100">
                <CardImageCarousel images={selectedProperty.images} alt={selectedProperty.title} priority />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-semibold">{formatPropertyLocation(selectedProperty)}</h3>
                  <span className="flex shrink-0 items-center gap-1 text-sm">
                    <Star size={13} fill="currentColor" /> {selectedProperty.rating || "New"}
                  </span>
                </div>
                <p className="truncate text-sm text-black/55">
                  {selectedProperty.propertyType} · {selectedProperty.bedrooms} beds
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-semibold">
                    {formatCurrency(calculateGuestPriceWithMarkup(selectedProperty.pricePerNight))}
                  </span>{" "}
                  night
                </p>
              </div>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
