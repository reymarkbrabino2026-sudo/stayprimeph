'use client';

import { useEffect, useMemo, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { defaultMapCenter, resolveLocationCoordinates } from "@/lib/property-map";
import { getListingMarkers } from "@/lib/search-map";
import type { PublicListingSummary } from "@/lib/types";
import { formatSearchLocationLabel, normalizePropertyLocationSearchQuery } from "@/lib/property-location";

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
      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      markers.forEach((marker) => {
        const icon = L.divIcon({
          className: "stayprimeph-price-marker",
          html: `<div class="map-price-pill" style="display:inline-flex;align-items:center;justify-content:center;min-width:64px;border-radius:9999px;background:#fff;padding:0.6rem 0.9rem;color:#1f1b16;text-align:center;font-size:0.875rem;font-weight:600;line-height:1;white-space:nowrap;box-shadow:0 10px 25px rgb(0 0 0 / 0.18);transform:translate(-50%, -50%);">${marker.label}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        L.marker(marker.coords, { icon })
          .addTo(map)
          .bindPopup(`<strong>${marker.title}</strong><br>${marker.location}`);
      });

      if (destinationMarker) {
        const destinationIcon = L.divIcon({
          className: "",
          html: `<div class="grid size-10 place-items-center rounded-full bg-[#083f35] text-white shadow-lg ring-4 ring-white"><span class="size-3 rounded-full bg-white"></span></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        L.marker(destinationMarker.coords, { icon: destinationIcon })
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
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-[#e9f0ea]">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0_42%,rgb(255_255_255_/_0.55)_42%_44%,transparent_44%_100%),linear-gradient(25deg,transparent_0_52%,rgb(255_255_255_/_0.5)_52%_54%,transparent_54%_100%),radial-gradient(circle_at_28%_30%,rgb(76_156_111_/_0.32),transparent_16%),radial-gradient(circle_at_70%_58%,rgb(33_150_180_/_0.24),transparent_18%),radial-gradient(circle_at_44%_76%,rgb(232_190_93_/_0.26),transparent_13%)]" />
      <div ref={mapRef} className="relative z-10 h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 z-[400] max-w-[calc(100%-5.5rem)] rounded-2xl bg-white/95 px-4 py-3 text-sm shadow-sm sm:left-6 sm:top-6">
        <p className="font-semibold">Explore stays on the map</p>
        <p className="mt-1 text-black/55">
          {destinationMarker ? destinationMarker.title : `${markers.length} homes across the Philippines`}
        </p>
      </div>
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">
        Search as I move the map
      </div>
    </div>
  );
}
