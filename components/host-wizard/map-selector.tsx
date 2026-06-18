"use client";

import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { CheckCircle2, LocateFixed, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultMapCenter, defaultMapCenterLabel } from "@/lib/property-map";
import { useHostWizardStore } from "@/stores/host-wizard-store";

interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

function formatDraftAddress(draft: ReturnType<typeof useHostWizardStore.getState>["draft"]) {
  return [draft.street, draft.barangay, draft.city, draft.province, draft.country, draft.zipCode]
    .filter(Boolean)
    .join(", ");
}

export function MapSelector() {
  const { draft, updateDraft } = useHostWizardStore();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const addressQueryRef = useRef("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const addressQuery = useMemo(() => formatDraftAddress(draft), [draft]);
  const canAutoGeocode = !draft.locationConfirmed || draft.lastAutoGeocodeAddress !== addressQuery;
  const pinConfirmed = draft.locationPinned && draft.locationConfirmed && draft.locationConfirmedAddress === addressQuery;
  const canConfirmCurrentPin = Boolean(addressQuery && status !== "loading" && (draft.locationPinned || draft.lastAutoGeocodeAddress === addressQuery));

  useEffect(() => {
    addressQueryRef.current = addressQuery;
  }, [addressQuery]);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      if (!mapElementRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (cancelled || !mapElementRef.current) return;

      const map = L.map(mapElementRef.current, {
        center: [draft.latitude, draft.longitude],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const marker = L.marker([draft.latitude, draft.longitude], {
        draggable: true,
        icon: L.divIcon({
          className: "stayprimeph-map-pin",
          html: '<span aria-hidden="true"></span>',
          iconSize: [34, 42],
          iconAnchor: [17, 42],
        }),
      }).addTo(map);

      marker.on("dragend", async () => {
        const next = marker.getLatLng();
        const currentAddressQuery = addressQueryRef.current;
        updateDraft({
          latitude: next.lat,
          longitude: next.lng,
          locationPinned: true,
          locationConfirmed: true,
          locationConfirmedAddress: currentAddressQuery,
          lastAutoGeocodeAddress: currentAddressQuery,
        });
        await reverseGeocode(next.lat, next.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    }

    void setupMap();

    return () => {
      cancelled = true;
    };
  }, [draft.latitude, draft.longitude, updateDraft]);

  useEffect(() => {
    markerRef.current?.setLatLng([draft.latitude, draft.longitude]);
    mapRef.current?.setView([draft.latitude, draft.longitude], mapRef.current.getZoom());
  }, [draft.latitude, draft.longitude]);

  useEffect(() => {
    if (!addressQuery || !canAutoGeocode) return;
    const timeout = window.setTimeout(() => {
      void geocodeAddress();
    }, 450);

    return () => window.clearTimeout(timeout);
    // We intentionally geocode when the entered address changes, not whenever the callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressQuery]);

  async function geocodeAddress() {
    if (!addressQuery) return;
    setStatus("loading");
    setError("");

    try {
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(addressQuery)}`);
      if (!response.ok) throw new Error("Unable to find that address.");
      const result = (await response.json()) as GeocodeResult;
      updateDraft({
        latitude: result.latitude,
        longitude: result.longitude,
        locationPinned: false,
        locationConfirmed: false,
        locationConfirmedAddress: "",
        lastAutoGeocodeAddress: addressQuery,
      });
      setResolvedAddress(result.displayName);
      setStatus("ready");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Unable to locate this address.");
    }
  }

  async function reverseGeocode(latitude: number, longitude: number) {
    setStatus("loading");
    setError("");

    try {
      const response = await fetch(`/api/geocode/reverse?latitude=${latitude}&longitude=${longitude}`);
      if (!response.ok) throw new Error("Unable to read this pin location.");
      const result = (await response.json()) as GeocodeResult;
      setResolvedAddress(result.displayName);
      setStatus("ready");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Unable to read this pin location.");
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Current location is not available in this browser.");
      return;
    }

    setStatus("loading");
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        updateDraft({
          latitude,
          longitude,
          locationPinned: true,
          locationConfirmed: true,
          locationConfirmedAddress: addressQuery,
          lastAutoGeocodeAddress: addressQuery,
        });
        await reverseGeocode(latitude, longitude);
      },
      () => {
        setStatus("error");
        setError("Location permission was not granted.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function confirmCurrentPin() {
    if (!canConfirmCurrentPin) return;
    updateDraft({
      locationPinned: true,
      locationConfirmed: true,
      locationConfirmedAddress: addressQuery,
      lastAutoGeocodeAddress: addressQuery,
    });
    setStatus("ready");
    setError("");
  }

  const visibleAddress = resolvedAddress || addressQuery || "Enter an address to place the pin";
  const isDefaultLocation = draft.latitude === defaultMapCenter[0] && draft.longitude === defaultMapCenter[1];

  return (
    <div className="rounded-[2rem] bg-emerald-50 p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-[1.5rem] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium sm:text-base">{visibleAddress}</p>
            <p className="mt-1 text-xs text-black/55">
              {status === "loading" ? "Finding this location..." : `${draft.latitude.toFixed(6)}, ${draft.longitude.toFixed(6)}${isDefaultLocation ? ` (${defaultMapCenterLabel})` : ""}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void geocodeAddress()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-medium transition hover:border-black/30"
          >
            <RefreshCw className="h-4 w-4" />
            Recenter
          </button>
          <button
            type="button"
            onClick={useCurrentLocation}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#222] px-4 text-sm font-medium text-white transition hover:bg-black"
          >
            <LocateFixed className="h-4 w-4" />
            Use my location
          </button>
          <button
            type="button"
            onClick={confirmCurrentPin}
            disabled={!canConfirmCurrentPin}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              pinConfirmed ? "bg-emerald-700 text-white" : "bg-[#083f35] text-white hover:bg-[#052d26]"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {pinConfirmed ? "Pin confirmed" : "Confirm pin"}
          </button>
        </div>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-[1.5rem]">
        <div ref={mapElementRef} className="h-72 w-full sm:h-96" aria-label="Interactive listing location map" />
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {!pinConfirmed ? <p className="mt-3 text-sm font-medium text-amber-700">Move the pin to the exact entrance or use your GPS location, then confirm it before continuing.</p> : null}

      <label className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
        <span>
          <span className="block font-semibold">Show precise location</span>
          <span className="text-sm text-black/60">Let guests see the exact map location before they book.</span>
        </span>
        <input type="checkbox" checked={draft.preciseLocation} onChange={(event) => updateDraft({ preciseLocation: event.target.checked })} className="h-6 w-6" />
      </label>
    </div>
  );
}
