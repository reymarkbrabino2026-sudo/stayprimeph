"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { MapPin } from "lucide-react";
import { defaultMapCenter, resolvePropertyCoordinates } from "@/lib/property-map";
import type { Property } from "@/lib/types";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";

export function RoomMap({ property }: { property: Property }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const center = useMemo<[number, number]>(
    () => resolvePropertyCoordinates(property) ?? defaultMapCenter,
    [property],
  );
  const priceLabel = useMemo(() => formatCurrency(property.pricePerNight), [property.pricePerNight]);
  const locationLabel = formatPropertyLocation(property);

  useEffect(() => {
    let active = true;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let resizeObserver: ResizeObserver | null = null;

    function invalidateMapSize() {
      requestAnimationFrame(() => leafletMapRef.current?.invalidateSize());
    }

    async function setupMap() {
      if (!mapRef.current || leafletMapRef.current) return;

      const L = await import("leaflet");
      if (!active || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div class="map-price-pill">${priceLabel}</div>`,
      });

      L.marker(center, { icon })
        .addTo(map)
        .bindPopup(`<strong>${property.title}</strong><br>${locationLabel}`);

      leafletMapRef.current = map;
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
  }, [center, priceLabel, property.title, locationLabel]);

  return (
    <div className="relative h-[26rem] w-full overflow-hidden rounded-[2rem] bg-[#e9f0ea] ring-1 ring-black/10">
      <div ref={mapRef} className="absolute inset-0 z-10 h-full w-full" />
      <div className="pointer-events-none absolute left-5 top-5 z-[500] max-w-[18rem] rounded-2xl bg-white/95 px-4 py-3 shadow-[0_12px_40px_rgb(0_0_0_/_0.12)]">
        <p className="flex items-center gap-2 font-semibold text-[#083f35]">
          <MapPin size={16} /> {locationLabel}
        </p>
        <p className="mt-1 text-xs leading-5 text-black/55">
          Approximate location. The exact address is shared after a confirmed booking.
        </p>
      </div>
    </div>
  );
}
