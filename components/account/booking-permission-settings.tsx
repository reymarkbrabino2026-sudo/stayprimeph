"use client";

import { Check } from "lucide-react";
import { useMemo } from "react";
import { useLocalStorageState } from "@/lib/use-local-storage-state";

type PermissionId = "profilePhoto" | "verifiedPhone" | "instantBooking" | "newGuests";

type PermissionState = Record<PermissionId, boolean>;

const storageKey = "stayprimeph:booking-permissions:v1";

const defaults: PermissionState = {
  profilePhoto: false,
  verifiedPhone: true,
  instantBooking: false,
  newGuests: true,
};

const permissions: Array<{ id: PermissionId; title: string; body: string }> = [
  { id: "profilePhoto", title: "Require profile photo", body: "Guests must add a profile photo before booking your place." },
  { id: "verifiedPhone", title: "Require verified phone number", body: "Guests need a confirmed phone number before they can request a stay." },
  { id: "instantBooking", title: "Allow instant booking", body: "Eligible guests can book without waiting for manual approval." },
  { id: "newGuests", title: "Accept requests from new guests", body: "Let guests without past StayPrimePH trips send reservation requests." },
];

function deserializeSettings(value: string) {
  return { ...defaults, ...(JSON.parse(value) as Partial<PermissionState>) };
}

export function BookingPermissionSettings() {
  const [settings, setSettings] = useLocalStorageState(storageKey, defaults, { deserialize: deserializeSettings });

  const enabledCount = useMemo(() => Object.values(settings).filter(Boolean).length, [settings]);

  function save(next: PermissionState) {
    setSettings(next);
  }

  function togglePermission(id: PermissionId) {
    save({ ...settings, [id]: !settings[id] });
  }

  function resetDefaults() {
    save(defaults);
  }

  return (
    <>
      <div className="mt-8">
        {permissions.map((permission) => {
          const checked = settings[permission.id];
          return (
            <button
              key={permission.id}
              type="button"
              role="switch"
              aria-checked={checked}
              onClick={() => togglePermission(permission.id)}
              className="grid w-full grid-cols-[1fr_auto] gap-6 border-b border-black/10 py-6 text-left"
            >
              <span>
                <span className="block font-semibold">{permission.title}</span>
                <span className="mt-1 block text-sm text-black/65">{permission.body}</span>
              </span>
              <span className={`relative inline-flex h-8 w-12 shrink-0 items-center rounded-full transition ${checked ? "bg-[#222]" : "bg-black/45"}`}>
                <span className={`grid size-7 place-items-center rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0.5"}`}>
                  {checked ? <Check size={15} strokeWidth={2.4} /> : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-black/15 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Reservation requests</h3>
            <p className="mt-2 text-sm text-black/65">{requestSummary(settings)}</p>
          </div>
          <button type="button" onClick={resetDefaults} className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:border-black">
            Reset
          </button>
        </div>
        <div className="mt-5 grid gap-3 text-sm text-black/65 sm:grid-cols-2">
          <SummaryTile label="Active requirements" value={`${enabledCount} of ${permissions.length}`} />
          <SummaryTile label="Booking flow" value={settings.instantBooking ? "Instant booking enabled" : "Manual approval required"} />
          <SummaryTile label="Guest profile" value={settings.profilePhoto ? "Photo required" : "Photo optional"} />
          <SummaryTile label="New guests" value={settings.newGuests ? "Requests accepted" : "Past guests only"} />
        </div>
      </div>
    </>
  );
}

function requestSummary(settings: PermissionState) {
  if (!settings.newGuests) return "New guests without past StayPrimePH trips cannot send reservation requests.";
  if (settings.instantBooking) return "Eligible guests can book instantly; guests who do not qualify can still send a request.";
  return "Guests who do not meet your requirements can still send a message before booking.";
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.02] p-4">
      <p className="font-semibold text-black">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}
