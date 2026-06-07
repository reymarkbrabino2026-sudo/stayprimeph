"use client";

import { Check } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveBookingPermissionsAction } from "@/app/account-settings/actions";
import { defaultBookingPermissions, type BookingPermissionId, type BookingPermissionState } from "@/lib/account-settings-types";

const permissions: Array<{ id: BookingPermissionId; title: string; body: string }> = [
  { id: "profilePhoto", title: "Require profile photo", body: "Guests must add a profile photo before booking your place." },
  { id: "verifiedPhone", title: "Require verified phone number", body: "Guests need a confirmed phone number before they can request a stay." },
  { id: "instantBooking", title: "Allow instant booking", body: "Eligible guests can book without waiting for manual approval." },
  { id: "newGuests", title: "Accept requests from new guests", body: "Let guests without past StayPrimePH trips send reservation requests." },
];

export function BookingPermissionSettings({ initialSettings }: { initialSettings: BookingPermissionState }) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const enabledCount = useMemo(() => Object.values(settings).filter(Boolean).length, [settings]);

  function save(next: BookingPermissionState) {
    setSettings(next);
    setMessage("");
    startTransition(async () => {
      const result = await saveBookingPermissionsAction(next);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setSettings(result.data);
      setMessage("Saved.");
    });
  }

  function togglePermission(id: BookingPermissionId) {
    save({ ...settings, [id]: !settings[id] });
  }

  function resetDefaults() {
    save(defaultBookingPermissions);
  }

  return (
    <>
      <div className="mt-8">
        {message ? <p className="mb-2 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
        {permissions.map((permission) => {
          const checked = settings[permission.id];
          return (
            <button
              key={permission.id}
              type="button"
              role="switch"
              aria-checked={checked}
              disabled={isPending}
              onClick={() => togglePermission(permission.id)}
              className="grid w-full grid-cols-[1fr_auto] gap-6 border-b border-black/10 py-6 text-left disabled:cursor-not-allowed disabled:opacity-60"
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
          <button type="button" onClick={resetDefaults} disabled={isPending} className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60">
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

function requestSummary(settings: BookingPermissionState) {
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
