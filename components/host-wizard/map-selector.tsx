"use client";

import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { AlertCircle, Check, CheckCircle2, LocateFixed, MapPin, RefreshCw, ShieldCheck } from "lucide-react";
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
  const { currentStep, draft, setStep, updateDraft } = useHostWizardStore();
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
  const isDefaultLocation = draft.latitude === defaultMapCenter[0] && draft.longitude === defaultMapCenter[1];
  const statusLabel = status === "loading" ? "Locating" : pinConfirmed ? "Confirmed" : status === "error" ? "Needs attention" : "Ready to confirm";
  const coordinatesLabel = `${draft.latitude.toFixed(6)}, ${draft.longitude.toFixed(6)}${isDefaultLocation ? ` (${defaultMapCenterLabel})` : ""}`;

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
    if (currentStep === "location") setStep("visibility");
  }

  const visibleAddress = resolvedAddress || addressQuery || "Enter an address to place the pin";

  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-[#eefbf4] shadow-[0_24px_70px_rgba(8,63,53,0.08)]">
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-4 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-[0_16px_45px_rgba(8,63,53,0.06)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-800">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 max-w-full truncate text-sm font-semibold text-[#222] sm:text-base">{visibleAddress}</p>
                <span
                  className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${
                    pinConfirmed
                      ? "bg-emerald-50 text-emerald-800"
                      : status === "error"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {pinConfirmed ? <CheckCircle2 className="h-3.5 w-3.5" /> : status === "error" ? <AlertCircle className="h-3.5 w-3.5" /> : null}
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-black/55">
                {status === "loading" ? "Finding this location..." : coordinatesLabel}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:justify-end">
            <button
              type="button"
              onClick={() => void geocodeAddress()}
              disabled={!addressQuery || status === "loading"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-[#222] transition hover:border-black/25 hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
              Recenter
            </button>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={status === "loading"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#222] px-3 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LocateFixed className="h-4 w-4" />
              Use GPS
            </button>
            <button
              type="button"
              onClick={confirmCurrentPin}
              disabled={!canConfirmCurrentPin}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                pinConfirmed ? "bg-emerald-700 text-white" : "bg-[#083f35] text-white hover:bg-[#052d26]"
              }`}
            >
              {pinConfirmed ? <Check className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {pinConfirmed ? "Confirmed" : "Confirm pin"}
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-950/10 bg-white">
          <div ref={mapElementRef} className="h-[22rem] w-full sm:h-[27rem]" aria-label="Interactive listing location map" />
          {status === "loading" ? (
            <div className="pointer-events-none absolute inset-x-3 top-3 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-sm font-semibold text-[#222] shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur" role="status">
              Finding the best map position...
            </div>
          ) : null}
        </div>

        {error || !pinConfirmed ? (
          <div
            className={`flex items-start gap-3 rounded-2xl border p-3 text-sm ${
              error ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
            role={error ? "alert" : "status"}
          >
            {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <MapPin className="mt-0.5 h-4 w-4 shrink-0" />}
            <p className="font-medium">{error || "Place the pin at the guest entrance, then confirm it to continue."}</p>
          </div>
        ) : null}

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-[0_16px_45px_rgba(8,63,53,0.05)]">
          <span className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f7f2ea] text-[#4f3f2d]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">Show precise location</span>
              <span className="mt-1 block text-sm text-black/60">Let guests see the exact map location before they book.</span>
            </span>
          </span>
          <input
            type="checkbox"
            checked={draft.preciseLocation}
            onChange={(event) => updateDraft({ preciseLocation: event.target.checked })}
            className="peer sr-only"
          />
          <span className="relative h-8 w-14 shrink-0 rounded-full bg-black/15 transition peer-checked:bg-emerald-700 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-900">
            <span className={`absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white shadow-sm transition ${draft.preciseLocation ? "translate-x-6 text-emerald-700" : "text-transparent"}`}>
              <Check className="h-3.5 w-3.5" />
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
