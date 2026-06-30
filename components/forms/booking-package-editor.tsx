"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { BookingPackage, BookingPackageUnit, Property } from "@/lib/types";

const maxBookingPackages = 8;

type EditablePackage = {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  displayOrder: number;
  accessType: string;
  unit: BookingPackageUnit;
  weekdayRate: number;
  weekendRate: number;
  holidayRate: number;
  includedGuests: number;
  maxGuests: number;
  sleepingCapacity: number;
  durationHours: number;
  additionalGuestFee: number;
  extensionHourlyFee: number;
  checkInTime: string;
  checkOutTime: string;
  accessibleFloors: string;
  accessibleRoomIds: string;
  includedAmenities: string;
  excludedAmenities: string;
  availableDays: string;
  minimumAdvanceBookingDays: number;
  blockedPackageIds: string;
  holidayDates: string;
  seasonalRates: string;
  enabled: boolean;
};

function csv(values?: string[]) {
  return (values ?? []).join(", ");
}

function json(values?: unknown[]) {
  return JSON.stringify(values ?? []);
}

function packageToEditable(pkg: BookingPackage, index: number, property: Property): EditablePackage {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description ?? "",
    status: pkg.status ?? "active",
    displayOrder: pkg.displayOrder ?? index + 1,
    accessType: pkg.accessType,
    unit: pkg.unit,
    weekdayRate: pkg.weekdayRate,
    weekendRate: pkg.weekendRate,
    holidayRate: pkg.holidayRate ?? pkg.weekendRate,
    includedGuests: pkg.includedGuests,
    maxGuests: pkg.maxGuests,
    sleepingCapacity: pkg.sleepingCapacity ?? 0,
    durationHours: pkg.durationHours ?? 0,
    additionalGuestFee: pkg.additionalGuestFee,
    extensionHourlyFee: pkg.extensionHourlyFee,
    checkInTime: pkg.checkInTime,
    checkOutTime: pkg.checkOutTime,
    accessibleFloors: csv(pkg.accessibleFloors),
    accessibleRoomIds: json(pkg.accessibleRoomIds),
    includedAmenities: csv(pkg.includedAmenities?.length ? pkg.includedAmenities : property.amenities),
    excludedAmenities: csv(pkg.excludedAmenities),
    availableDays: json(pkg.availableDays?.length ? pkg.availableDays : [0, 1, 2, 3, 4, 5, 6]),
    minimumAdvanceBookingDays: pkg.minimumAdvanceBookingDays ?? 0,
    blockedPackageIds: json(pkg.blockedPackageIds),
    holidayDates: csv(pkg.holidayDates),
    seasonalRates: json(pkg.seasonalRates),
    enabled: pkg.enabled,
  };
}

function newPackage(property: Property, displayOrder: number): EditablePackage {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const id = `${property.id}-custom-package-${suffix}`.slice(0, 80);
  const weekdayRate = property.pricePerNight || 1;
  const weekendRate = property.weekendPrice && property.weekendPrice > 0 ? property.weekendPrice : weekdayRate;
  const guests = Math.max(1, property.maxGuests || 1);

  return {
    id,
    name: `Custom package ${displayOrder}`,
    description: "",
    status: "active",
    displayOrder,
    accessType: "Custom access",
    unit: "day",
    weekdayRate,
    weekendRate,
    holidayRate: weekendRate,
    includedGuests: guests,
    maxGuests: guests,
    sleepingCapacity: 0,
    durationHours: 9,
    additionalGuestFee: 0,
    extensionHourlyFee: 0,
    checkInTime: "12:00 PM",
    checkOutTime: "9:00 PM",
    accessibleFloors: "",
    accessibleRoomIds: "[]",
    includedAmenities: csv(property.amenities),
    excludedAmenities: "",
    availableDays: "[0,1,2,3,4,5,6]",
    minimumAdvanceBookingDays: 0,
    blockedPackageIds: json(property.bookingPackages?.map((pkg) => pkg.id)),
    holidayDates: "",
    seasonalRates: "[]",
    enabled: true,
  };
}

export function BookingPackageEditor({ property, formId }: { property: Property; formId: string }) {
  const initialPackages = useMemo(
    () => [...(property.bookingPackages ?? [])]
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name))
      .map((pkg, index) => packageToEditable(pkg, index, property)),
    [property],
  );
  const [packages, setPackages] = useState(initialPackages);
  const canAddPackage = packages.length < maxBookingPackages;

  function updatePackage(id: string, patch: Partial<EditablePackage>) {
    setPackages((current) => current.map((pkg) => pkg.id === id ? { ...pkg, ...patch } : pkg));
  }

  function addPackage() {
    if (!canAddPackage) return;
    setPackages((current) => [...current, newPackage(property, current.length + 1)]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Booking packages</h3>
          <p className="mt-1 text-xs text-black/45">{packages.length}/{maxBookingPackages} packages</p>
        </div>
        <button
          type="button"
          onClick={addPackage}
          disabled={!canAddPackage}
          className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[#083f35] px-4 text-sm font-semibold text-white transition hover:bg-[#062f28] disabled:cursor-not-allowed disabled:bg-black/20"
        >
          <Plus size={16} aria-hidden="true" />
          Add package
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        {packages.length ? packages.map((pkg) => (
          <div key={pkg.id} className="rounded-2xl bg-[#fbf7f2] p-4 text-sm">
            <PackageHiddenFields pkg={pkg} formId={formId} />
            <div className="flex items-start justify-between gap-3">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Package name</span>
                <input
                  form={formId}
                  name="bookingPackageName"
                  value={pkg.name}
                  maxLength={80}
                  onChange={(event) => updatePackage(pkg.id, { name: event.target.value })}
                  className="min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 font-semibold outline-none transition focus:border-black"
                  placeholder="Package name"
                  required
                />
              </label>
              <select
                form={formId}
                name="bookingPackageEnabled"
                value={pkg.enabled ? "true" : "false"}
                onChange={(event) => {
                  const enabled = event.target.value === "true";
                  updatePackage(pkg.id, { enabled, status: enabled ? "active" : "inactive" });
                }}
                className="h-10 shrink-0 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-black/60"
              >
                <option value="true">Enabled</option>
                <option value="false">Off</option>
              </select>
            </div>

            <label className="mt-2 block">
              <span className="sr-only">Guest access</span>
              <input
                form={formId}
                name="bookingPackageAccessType"
                value={pkg.accessType}
                maxLength={120}
                onChange={(event) => updatePackage(pkg.id, { accessType: event.target.value })}
                className="min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-black/65 outline-none transition focus:border-black"
                placeholder="Guest access"
                required
              />
            </label>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <PackageNumberField formId={formId} label="Weekday rate" name="bookingPackageWeekdayRate" value={pkg.weekdayRate} min={1} onChange={(weekdayRate) => updatePackage(pkg.id, { weekdayRate })} />
              <PackageNumberField formId={formId} label="Weekend rate" name="bookingPackageWeekendRate" value={pkg.weekendRate} min={0} onChange={(weekendRate) => updatePackage(pkg.id, { weekendRate })} />
              <PackageNumberField formId={formId} label="Guests" name="bookingPackageMaxGuests" value={pkg.maxGuests} min={1} onChange={(maxGuests) => updatePackage(pkg.id, { maxGuests, includedGuests: Math.min(pkg.includedGuests, maxGuests) })} />
              <PackageNumberField formId={formId} label="Sleeps" name="bookingPackageSleepingCapacity" value={pkg.sleepingCapacity} min={0} onChange={(sleepingCapacity) => updatePackage(pkg.id, { sleepingCapacity })} />
              <PackageNumberField formId={formId} label="Hours" name="bookingPackageDurationHours" value={pkg.durationHours} min={1} onChange={(durationHours) => updatePackage(pkg.id, { durationHours })} />
              <label>
                <span className="mb-1 block text-xs text-black/45">Unit</span>
                <select
                  form={formId}
                  name="bookingPackageUnit"
                  value={pkg.unit}
                  onChange={(event) => updatePackage(pkg.id, { unit: event.target.value as BookingPackageUnit })}
                  className="min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-black"
                >
                  <option value="night">Night</option>
                  <option value="day">Day</option>
                </select>
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-black/45">Included amenities</span>
              <textarea
                form={formId}
                name="bookingPackageIncludedAmenities"
                value={pkg.includedAmenities}
                rows={3}
                onChange={(event) => updatePackage(pkg.id, { includedAmenities: event.target.value })}
                className="w-full rounded-xl border border-black/10 bg-white p-3 leading-6 outline-none transition focus:border-black"
                placeholder="WiFi, Kitchen, Pool"
              />
            </label>
          </div>
        )) : (
          <div className="rounded-2xl bg-[#fbf7f2] p-4 text-sm text-black/55">
            No booking packages yet. Use Add package to create one for guests.
          </div>
        )}
      </div>
    </div>
  );
}

function PackageHiddenFields({ pkg, formId }: { pkg: EditablePackage; formId: string }) {
  const fields: Array<[string, string | number]> = [
    ["bookingPackageId", pkg.id],
    ["bookingPackageDescription", pkg.description],
    ["bookingPackageStatus", pkg.status],
    ["bookingPackageDisplayOrder", pkg.displayOrder],
    ["bookingPackageHolidayRate", pkg.holidayRate],
    ["bookingPackageIncludedGuests", pkg.includedGuests],
    ["bookingPackageAdditionalGuestFee", pkg.additionalGuestFee],
    ["bookingPackageExtensionHourlyFee", pkg.extensionHourlyFee],
    ["bookingPackageCheckInTime", pkg.checkInTime],
    ["bookingPackageCheckOutTime", pkg.checkOutTime],
    ["bookingPackageAccessibleFloors", pkg.accessibleFloors],
    ["bookingPackageAccessibleRoomIds", pkg.accessibleRoomIds],
    ["bookingPackageExcludedAmenities", pkg.excludedAmenities],
    ["bookingPackageAvailableDays", pkg.availableDays],
    ["bookingPackageMinimumAdvanceBookingDays", pkg.minimumAdvanceBookingDays],
    ["bookingPackageBlockedPackageIds", pkg.blockedPackageIds],
    ["bookingPackageHolidayDates", pkg.holidayDates],
    ["bookingPackageSeasonalRates", pkg.seasonalRates],
  ];

  return (
    <>
      {fields.map(([name, value]) => (
        <input key={name} type="hidden" form={formId} name={name} value={value} />
      ))}
    </>
  );
}

function PackageNumberField({
  formId,
  label,
  name,
  value,
  min,
  onChange,
}: {
  formId: string;
  label: string;
  name: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs text-black/45">{label}</span>
      <input
        form={formId}
        name={name}
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-black"
      />
    </label>
  );
}
