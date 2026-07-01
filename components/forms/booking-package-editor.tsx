"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BookingPackage, BookingPackageUnit, Property, PropertyRoom } from "@/lib/types";

const maxBookingPackages = 8;
const packageInputClassName =
  "min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#083f35] focus:ring-4 focus:ring-[#083f35]/10";

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
  accessibleRoomIds: string[];
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

function normalizeListValue(value: string) {
  return value.trim().toLowerCase();
}

function csvTextValues(value: string) {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => {
      const key = normalizeListValue(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mergeTextValues(...groups: string[][]) {
  const seen = new Set<string>();
  return groups
    .flat()
    .map((item) => item.trim())
    .filter((item) => {
      const key = normalizeListValue(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function toggleCsvTextValue(value: string, option: string) {
  const values = csvTextValues(value);
  const optionKey = normalizeListValue(option);
  const hasOption = values.some((item) => normalizeListValue(item) === optionKey);
  return (hasOption
    ? values.filter((item) => normalizeListValue(item) !== optionKey)
    : [...values, option]
  ).join(", ");
}

function packageToEditable(pkg: BookingPackage, index: number, property: Property): EditablePackage {
  const activeRoomIds = new Set((property.rooms ?? []).filter((room) => room.active).map((room) => room.id));
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
    accessibleRoomIds: (pkg.accessibleRoomIds ?? []).filter((roomId) => activeRoomIds.has(roomId)),
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
    accessibleRoomIds: [],
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

export function BookingPackageEditor({ property, formId, hideTitle = false }: { property: Property; formId: string; hideTitle?: boolean }) {
  const initialPackages = useMemo(
    () => [...(property.bookingPackages ?? [])]
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name))
      .map((pkg, index) => packageToEditable(pkg, index, property)),
    [property],
  );
  const [packages, setPackages] = useState(initialPackages);
  const canAddPackage = packages.length < maxBookingPackages;
  const roomOptions = useMemo(() => (property.rooms ?? []).filter((room) => room.active), [property.rooms]);
  const amenityOptions = useMemo(() => mergeTextValues(property.amenities), [property.amenities]);

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
          {hideTitle ? null : <h3 className="font-bold text-[#21170f]">Booking packages</h3>}
          <p className={hideTitle ? "text-sm font-semibold text-black/60" : "mt-1 text-sm text-black/55"}>{packages.length}/{maxBookingPackages} packages</p>
        </div>
        <button
          type="button"
          onClick={addPackage}
          disabled={!canAddPackage}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#083f35] px-4 text-sm font-semibold text-white transition hover:bg-[#062f28] focus:outline-none focus:ring-4 focus:ring-[#083f35]/20 disabled:cursor-not-allowed disabled:bg-black/20"
        >
          <Plus size={16} aria-hidden="true" />
          Add package
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        {packages.length ? packages.map((pkg) => (
          <div key={pkg.id} className="rounded-[1.25rem] border border-black/10 bg-[#fbf7f2] p-4 text-sm shadow-sm">
            <PackageHiddenFields pkg={pkg} formId={formId} />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-black/45">Package name</span>
                <input
                  form={formId}
                  name="bookingPackageName"
                  value={pkg.name}
                  maxLength={80}
                  onChange={(event) => updatePackage(pkg.id, { name: event.target.value })}
                  className={`${packageInputClassName} font-semibold`}
                  placeholder="Package name"
                  required
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-black/45">Status</span>
                <select
                  form={formId}
                  name="bookingPackageEnabled"
                  value={pkg.enabled ? "true" : "false"}
                  onChange={(event) => {
                    const enabled = event.target.value === "true";
                    updatePackage(pkg.id, { enabled, status: enabled ? "active" : "inactive" });
                  }}
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-black/70 outline-none transition focus:border-[#083f35] focus:ring-4 focus:ring-[#083f35]/10"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Off</option>
                </select>
              </label>
            </div>

            <label className="mt-2 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-black/45">Guest access</span>
              <input
                form={formId}
                name="bookingPackageAccessType"
                value={pkg.accessType}
                maxLength={120}
                onChange={(event) => updatePackage(pkg.id, { accessType: event.target.value })}
                className={`${packageInputClassName} text-black/70`}
                placeholder="Guest access"
                required
              />
            </label>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <PackageNumberField formId={formId} label="Weekday rate" name="bookingPackageWeekdayRate" value={pkg.weekdayRate} min={1} step={0.01} onChange={(weekdayRate) => updatePackage(pkg.id, { weekdayRate })} />
              <PackageNumberField formId={formId} label="Weekend rate" name="bookingPackageWeekendRate" value={pkg.weekendRate} min={0} step={0.01} onChange={(weekendRate) => updatePackage(pkg.id, { weekendRate })} />
              <PackageNumberField formId={formId} label="Guests" name="bookingPackageMaxGuests" value={pkg.maxGuests} min={1} onChange={(maxGuests) => updatePackage(pkg.id, { maxGuests, includedGuests: Math.min(pkg.includedGuests, maxGuests) })} />
              <PackageNumberField formId={formId} label="Sleeps" name="bookingPackageSleepingCapacity" value={pkg.sleepingCapacity} min={0} onChange={(sleepingCapacity) => updatePackage(pkg.id, { sleepingCapacity })} />
              <PackageNumberField formId={formId} label="Hours" name="bookingPackageDurationHours" value={pkg.durationHours} min={1} onChange={(durationHours) => updatePackage(pkg.id, { durationHours })} />
              <label>
                <span className="mb-2 block text-xs font-semibold text-black/50">Unit</span>
                <select
                  form={formId}
                  name="bookingPackageUnit"
                  value={pkg.unit}
                  onChange={(event) => updatePackage(pkg.id, { unit: event.target.value as BookingPackageUnit })}
                  className={packageInputClassName}
                >
                  <option value="night">Night</option>
                  <option value="day">Day</option>
                </select>
              </label>
            </div>

            <PackageRoomDropdown
              rooms={roomOptions}
              selectedRoomIds={pkg.accessibleRoomIds}
              onChange={(accessibleRoomIds) => updatePackage(pkg.id, { accessibleRoomIds })}
            />

            <PackageAmenityChecklist
              amenities={mergeTextValues(amenityOptions, csvTextValues(pkg.includedAmenities))}
              selectedAmenities={pkg.includedAmenities}
              onChange={(includedAmenities) => updatePackage(pkg.id, { includedAmenities })}
            />
          </div>
        )) : (
          <div className="rounded-2xl border border-black/10 bg-[#fbf7f2] p-4 text-sm text-black/55">
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
    ["bookingPackageAccessibleRoomIds", json(pkg.accessibleRoomIds)],
    ["bookingPackageIncludedAmenities", pkg.includedAmenities],
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

function PackageAmenityChecklist({
  amenities,
  selectedAmenities,
  onChange,
}: {
  amenities: string[];
  selectedAmenities: string;
  onChange: (includedAmenities: string) => void;
}) {
  const selectedKeys = new Set(csvTextValues(selectedAmenities).map(normalizeListValue));

  return (
    <fieldset className="mt-3 rounded-xl border border-black/10 bg-white/75 p-3">
      <legend className="px-1 text-xs font-semibold text-black/50">Amenities</legend>
      {amenities.length ? (
        <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
          {amenities.map((amenity) => {
            const checked = selectedKeys.has(normalizeListValue(amenity));
            return (
              <label
                key={amenity}
                className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  checked
                    ? "border-[#083f35] bg-[#083f35] text-white"
                    : "border-black/10 bg-white text-black/65 hover:border-black/25 hover:text-black"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(toggleCsvTextValue(selectedAmenities, amenity))}
                  className="sr-only"
                />
                <span
                  className={`grid size-4 shrink-0 place-items-center rounded border ${
                    checked ? "border-white/30 bg-white text-[#083f35]" : "border-black/20 bg-white text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  <Check size={12} />
                </span>
                <span className="leading-tight">{amenity}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-black/45">No amenities added yet.</p>
      )}
    </fieldset>
  );
}

function selectedRoomSummary(rooms: PropertyRoom[], selectedRoomIds: string[]) {
  const selectedRooms = rooms.filter((room) => selectedRoomIds.includes(room.id));
  if (!selectedRooms.length) return "None";
  if (selectedRooms.length === 1) return selectedRooms[0].name;
  return `${selectedRooms.length} rooms selected`;
}

function PackageRoomDropdown({
  rooms,
  selectedRoomIds,
  onChange,
}: {
  rooms: PropertyRoom[];
  selectedRoomIds: string[];
  onChange: (roomIds: string[]) => void;
}) {
  function toggleRoom(roomId: string) {
    onChange(
      selectedRoomIds.includes(roomId)
        ? selectedRoomIds.filter((item) => item !== roomId)
        : [...selectedRoomIds, roomId],
    );
  }

  const selectedRoomSet = new Set(selectedRoomIds);

  return (
    <div className="mt-3">
      <span className="mb-1 block text-xs text-black/45">Rooms</span>
      <details className="group relative">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition hover:border-black/20 focus-visible:border-[#083f35] focus-visible:ring-4 focus-visible:ring-[#083f35]/10 [&::-webkit-details-marker]:hidden">
          <span className="truncate">{selectedRoomSummary(rooms, selectedRoomIds)}</span>
          <ChevronDown size={16} className="shrink-0 text-black/45 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-black/10 bg-white p-2 shadow-xl">
          <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm transition hover:bg-black/[0.04]">
            <input
              type="checkbox"
              checked={selectedRoomIds.length === 0}
              onChange={() => onChange([])}
              className="sr-only"
            />
            <span className="grid size-5 place-items-center rounded-md border border-black/20 text-white">
              {selectedRoomIds.length === 0 ? <Check size={14} className="text-[#083f35]" aria-hidden="true" /> : null}
            </span>
            <span className="font-medium">None</span>
          </label>
          {rooms.map((room) => {
            const checked = selectedRoomSet.has(room.id);
            return (
              <label key={room.id} className="mt-1 flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm transition hover:bg-black/[0.04]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRoom(room.id)}
                  className="sr-only"
                />
                <span className="grid size-5 place-items-center rounded-md border border-black/20 text-white">
                  {checked ? <Check size={14} className="text-[#083f35]" aria-hidden="true" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{room.name}</span>
                  <span className="block truncate text-xs text-black/45">{room.floor} - {room.capacity} pax</span>
                </span>
              </label>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function PackageNumberField({
  formId,
  label,
  name,
  value,
  min,
  step = 1,
  onChange,
}: {
  formId: string;
  label: string;
  name: string;
  value: number;
  min: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const [inputValue, setInputValue] = useState(String(value));
  const isEditing = useRef(false);

  useEffect(() => {
    if (!isEditing.current) setInputValue(String(value));
  }, [value]);

  return (
    <label>
      <span className="mb-2 block text-xs font-semibold text-black/50">{label}</span>
      <input
        form={formId}
        name={name}
        type="number"
        min={min}
        step={step}
        value={inputValue}
        onFocus={() => {
          isEditing.current = true;
        }}
        onBlur={() => {
          isEditing.current = false;
          if (inputValue.trim() === "" || !Number.isFinite(Number(inputValue))) {
            setInputValue(String(value));
          }
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          const numericValue = Number(nextValue);
          setInputValue(nextValue);
          if (nextValue.trim() === "" || Number.isFinite(numericValue)) onChange(numericValue);
        }}
        className={packageInputClassName}
      />
    </label>
  );
}
