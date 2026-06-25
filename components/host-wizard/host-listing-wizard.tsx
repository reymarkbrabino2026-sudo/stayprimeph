"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  AlarmSmoke, Armchair, Baby, Bath, BedDouble, BriefcaseMedical, Building, Building2, CarFront, CookingPot, DoorOpen,
  Check, FireExtinguisher, Flame, Home, Hotel, House, Lamp, Laptop, Layers, Leaf, MapPin, Mic, Palmtree, Projector,
  Plus, Puzzle, ShieldAlert, Snowflake, Sofa, Sparkles, Sun, Target, TentTree, Tractor, Trash2, TreePine, Tv, Umbrella, Users,
  UtensilsCrossed, WashingMachine, Waves, Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { publishWizardListing, saveWizardListingDraft } from "@/app/host/listings/actions";
import { AmenityCard, CounterInput, OptionCard } from "@/components/host-wizard/cards";
import { DescriptionInput, ListingPreviewCard } from "@/components/host-wizard/content";
import { ImageUploader, RoomPhotoUploader, UploadCard } from "@/components/host-wizard/image-uploader";
import { MapSelector } from "@/components/host-wizard/map-selector";
import { StepLayout, StepTransition } from "@/components/host-wizard/step-layout";
import { amenityGroups, highlightOptions, hostWizardSteps, privacyTypes, propertyTypes } from "@/lib/host-wizard-data";
import { syncedBookingPackagesForPricing } from "@/lib/host-wizard-pricing";
import { hostListingAddressSchema, hostListingSchema } from "@/lib/host-wizard-schema";
import type { HostBookingPackageDraft, HostPropertyRoomDraft, HostSeasonalRateDraft } from "@/lib/host-wizard-types";
import { isValidVirtualTourUrl } from "@/lib/virtual-tour";
import { useHostWizardStore } from "@/stores/host-wizard-store";

const iconMap = {
  house: House, "building-2": Building2, "tent-tree": TentTree, landmark: Home, home: Home, hotel: Hotel,
  tractor: Tractor, "door-open": DoorOpen, building: Building, palmtree: Palmtree, waves: Waves, "tree-pine": TreePine,
  users: Users, wifi: Wifi, tv: Tv, "cooking-pot": CookingPot, "washing-machine": WashingMachine, "car-front": CarFront,
  laptop: Laptop, snowflake: Snowflake, bath: Bath, umbrella: Umbrella, flame: Flame, "utensils-crossed": UtensilsCrossed,
  bonfire: Flame, "alarm-smoke": AlarmSmoke, "briefcase-medical": BriefcaseMedical, "fire-extinguisher": FireExtinguisher,
  "shield-alert": ShieldAlert, leaf: Leaf, sparkles: Sparkles, baby: Baby, lamp: Lamp, "map-pin": MapPin,
  sofa: Sofa, armchair: Armchair, projector: Projector, mic: Mic, target: Target, puzzle: Puzzle, layers: Layers, sun: Sun,
};

const amenityLabelById = new Map(
  amenityGroups.flatMap((group) => group.items.map((item) => [item.id, item.label] as const)),
);

const weekdayOptions = [
  ["Sun", 0],
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["Sat", 6],
] as const;

function DynamicIcon({ name }: { name: keyof typeof iconMap | string }) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? House;
  return <Icon className="h-7 w-7" />;
}

function HighlightPicker() {
  const { draft, toggleHighlight } = useHostWizardStore();

  return (
    <div className="mt-8 rounded-[2rem] border border-black/5 bg-black/[0.015] p-4 sm:p-5">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">Choose highlights</p>
          <p className="mt-2 text-base text-black/60">Pick the two traits guests should remember first.</p>
        </div>
        <div className="rounded-full bg-black/[0.04] px-3 py-1 text-sm font-medium text-black/70">
          {draft.highlights.length}/2 selected
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {highlightOptions.map((item) => {
          const selected = draft.highlights.includes(item.id);

          return (
            <motion.button
              key={item.id}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleHighlight(item.id)}
              className={`group flex min-h-[4.5rem] items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left text-base font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                selected
                  ? "border-black bg-black text-white shadow-[0_16px_32px_rgba(0,0,0,0.16)]"
                  : "border-black/10 bg-white text-[#222] hover:border-black/30 hover:bg-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-full ${
                  selected ? "bg-white/15 text-white" : "bg-black/[0.04] text-black/70"
                }`}>
                  <DynamicIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </span>
              <span
                className={`grid h-7 w-7 place-items-center rounded-full border transition ${
                  selected
                    ? "border-white/20 bg-white text-black"
                    : "border-black/10 bg-white text-transparent group-hover:border-black/25"
                }`}
                aria-hidden="true"
              >
                <Check className="h-4 w-4" />
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

const addressSchema = hostListingAddressSchema;
type AddressValues = z.infer<typeof addressSchema>;

function formatAddressValues(values: AddressValues) {
  return [values.street, values.barangay, values.city, values.province, values.country, values.zipCode]
    .filter(Boolean)
    .join(", ");
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCsv(values: string[]) {
  return values.join(", ");
}

function splitDateKeys(value: string) {
  return splitCsv(value).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));
}

function formatSeasonalRates(values: HostSeasonalRateDraft[] = []) {
  return values
    .map((item) => [
      item.name,
      item.startDate,
      item.endDate,
      item.weekdayRate,
      item.weekendRate || "",
      item.holidayRate || "",
    ].join(" | "))
    .join("\n");
}

function parseSeasonalRates(value: string, fallback: HostSeasonalRateDraft[] = []) {
  const parsed = value
    .split(/\r?\n/)
    .map((line, index) => {
      const [name, startDate, endDate, weekdayRate, weekendRate, holidayRate] = line.split("|").map((item) => item.trim());
      return {
        id: fallback[index]?.id ?? `season-${Date.now().toString(36)}-${index}`,
        name: name || fallback[index]?.name || "Seasonal rate",
        startDate: startDate || "",
        endDate: endDate || "",
        weekdayRate: Number(weekdayRate),
        weekendRate: Number(weekendRate || 0),
        holidayRate: Number(holidayRate || 0),
      };
    })
    .filter((item) =>
      /^\d{4}-\d{2}-\d{2}$/.test(item.startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.endDate) &&
      item.endDate >= item.startDate &&
      Number.isFinite(item.weekdayRate) &&
      item.weekdayRate > 0,
    );

  return parsed;
}

export function HostListingWizard({ user, csrfToken, freshStart = false }: { user: { id: string; email: string }; csrfToken: string; freshStart?: boolean }) {
  const router = useRouter();
  const { ownerUserId, initialized, currentStep, draft, initializeForUser, setStep, updateDraft, toggleAmenity } = useHostWizardStore();
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const step = hostWizardSteps.find((item) => item.id === currentStep) ?? hostWizardSteps[0];

  useEffect(() => {
    initializeForUser(user, { fresh: freshStart });
    if (freshStart && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [freshStart, initializeForUser, user]);

  useEffect(() => {
    if (!hostWizardSteps.some((item) => item.id === currentStep)) {
      setStep("address");
    }
  }, [currentStep, setStep]);

  const addressForm = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    values: {
      country: draft.country,
      street: draft.street,
      barangay: draft.barangay,
      city: draft.city,
      province: draft.province,
      zipCode: draft.zipCode,
    },
  });

  const titleRemaining = 50 - draft.title.length;
  const selectedAmenities = useMemo(() => new Set(draft.amenityIds), [draft.amenityIds]);
  const selectedAmenityLabels = useMemo(() => draft.amenityIds.map((id) => amenityLabelById.get(id) ?? id), [draft.amenityIds]);
  const activeRooms = useMemo(() => draft.rooms.filter((room) => room.active), [draft.rooms]);
  const virtualTourUrlValid = isValidVirtualTourUrl(draft.virtualTourUrl);
  const availableFloors = useMemo(
    () => Array.from(new Set(draft.rooms.map((room) => room.floor.trim()).filter(Boolean))),
    [draft.rooms],
  );

  async function saveAndExit() {
    if (isSavingDraft) return;

    setPublishError("");
    setIsSavingDraft(true);
    try {
      await saveWizardListingDraft({ ...draft, status: "draft" }, csrfToken);
      router.push("/host/listings");
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't save your draft. Please try again.";
      setIsSavingDraft(false);
      setPublishError(message);
      alert(message);
    }
  }

  async function submitListing() {
    if (isPublishing) return;
    setPublishError("");

    const parsed = hostListingSchema.safeParse({ ...draft, status: "pending" });
    if (!parsed.success) {
      const message = draft.locationConfirmed ? "Please finish the missing steps before publishing your listing." : "Please confirm the map pin before publishing your listing.";
      setPublishError(message);
      alert(message);
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishWizardListing(parsed.data, csrfToken);
      if (result.status === "published") {
        router.push("/host/listings?published=1");
        return;
      }

      setIsPublishing(false);
      setPublishError(result.error);
      alert(result.error);
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't publish your listing. Please try again.";
      setIsPublishing(false);
      setPublishError(message);
      alert(message);
    }
  }

  function updateBookingPackage(id: string, patch: Partial<HostBookingPackageDraft>) {
    updateDraft({
      bookingPackages: draft.bookingPackages.map((item) => item.id === id ? { ...item, ...patch } : item),
    });
  }

  function updateRoom(id: string, patch: Partial<HostPropertyRoomDraft>) {
    updateDraft({
      rooms: draft.rooms.map((item) => item.id === id ? { ...item, ...patch } : item),
    });
  }

  function addRoom() {
    const id = `room-${Date.now().toString(36)}`;
    updateDraft({
      rooms: [
        ...draft.rooms,
        {
          id,
          name: "New room",
          capacity: 2,
          floor: draft.rooms.at(-1)?.floor || "Ground Floor",
          description: "",
          photos: [],
          amenities: [],
          active: true,
        },
      ],
    });
  }

  function removeRoom(id: string) {
    updateDraft({
      rooms: draft.rooms.filter((item) => item.id !== id),
      bookingPackages: draft.bookingPackages.map((item) => ({
        ...item,
        accessibleRoomIds: item.accessibleRoomIds.filter((roomId) => roomId !== id),
      })),
    });
  }

  function updateCsvList<T extends keyof HostBookingPackageDraft>(packageId: string, key: T, value: string) {
    updateBookingPackage(packageId, { [key]: splitCsv(value) } as Partial<HostBookingPackageDraft>);
  }

  function togglePackageListValue<T extends keyof HostBookingPackageDraft>(packageId: string, key: T, value: string) {
    const pkg = draft.bookingPackages.find((item) => item.id === packageId);
    const current = (pkg?.[key] as string[] | undefined) ?? [];
    updateBookingPackage(packageId, {
      [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    } as Partial<HostBookingPackageDraft>);
  }

  function toggleAvailableDay(packageId: string, day: number) {
    const pkg = draft.bookingPackages.find((item) => item.id === packageId);
    const current = pkg?.availableDays ?? [];
    const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b);
    updateBookingPackage(packageId, { availableDays: next.length ? next : current });
  }

  function bookingPackagesForPrices(nextBasePrice: number, nextWeekendPrice: number) {
    return syncedBookingPackagesForPricing({
      packages: draft.bookingPackages,
      previousBasePrice: draft.basePrice,
      previousWeekendPrice: draft.weekendPrice,
      nextBasePrice,
      nextWeekendPrice,
    });
  }

  if (!initialized || ownerUserId !== user.id) {
    return (
      <main className="grid min-h-dvh place-items-center bg-white px-4 text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-black/10 border-t-[#083f35]" />
          <p className="mt-4 text-sm text-black/60">Loading your saved listing draft…</p>
        </div>
      </main>
    );
  }

  function introPanel() {
    return (
      <section className="grid min-h-[55vh] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_28rem]">
        <div>
          {step.eyebrow ? <p className="text-lg">{step.eyebrow}</p> : null}
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{step.title}</h1>
          <p className="mt-5 max-w-md text-lg text-black/60">{step.description}</p>
        </div>
        <ListingPreviewCard />
      </section>
    );
  }

  return (
    <StepLayout onSaveAndExit={saveAndExit} isSavingDraft={isSavingDraft}>
      <StepTransition stepKey={currentStep}>
        {currentStep === "address" ? (
          <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_28rem]">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">{step.title}</h1>
              <p className="mt-5 max-w-md text-lg text-black/60">{step.description}</p>
              <form
                className="mt-8 grid gap-3 sm:grid-cols-2"
                onChange={() => {
                  const nextAddress = addressForm.getValues();
                  const nextFormattedAddress = formatAddressValues(nextAddress);
                  updateDraft({
                    ...nextAddress,
                    locationConfirmed: draft.locationConfirmed && draft.locationConfirmedAddress === nextFormattedAddress,
                    locationConfirmedAddress: draft.locationConfirmedAddress === nextFormattedAddress ? draft.locationConfirmedAddress : "",
                  });
                }}
              >
                {[
                  ["country", "Country"], ["street", "Street address"], ["barangay", "Barangay"],
                  ["city", "City"], ["province", "Province"], ["zipCode", "ZIP code"],
                ].map(([name, label]) => (
                  <label key={name} className={name === "street" ? "sm:col-span-2" : ""}>
                    <span className="mb-2 block text-sm font-medium">{label}</span>
                    <input {...addressForm.register(name as keyof AddressValues)} className="min-h-14 w-full rounded-2xl border px-4 outline-none focus:border-black" />
                  </label>
                ))}
              </form>
            </div>
            <ListingPreviewCard />
          </section>
        ) : null}

        {currentStep === "property-type" ? (
          <section className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
              {propertyTypes.map((item) => (
                <OptionCard key={item.id} selected={draft.propertyType === item.id} title={item.label} icon={<DynamicIcon name={item.icon} />} onClick={() => updateDraft({ propertyType: item.id })} />
              ))}
            </div>
          </section>
        ) : null}

        {currentStep === "place-intro" || currentStep === "standout-intro" || currentStep === "finish-intro" ? introPanel() : null}

        {currentStep === "privacy-type" ? (
          <section className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <div className="mt-8 grid gap-3">
              {privacyTypes.map((item) => (
                <OptionCard key={item.id} selected={draft.privacyType === item.id} title={item.label} description={item.description} icon={<DynamicIcon name={item.icon} />} onClick={() => updateDraft({ privacyType: item.id })} />
              ))}
            </div>
          </section>
        ) : null}

        {currentStep === "location" ? (
          <section className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <div className="mt-8"><MapSelector /></div>
          </section>
        ) : null}

        {currentStep === "visibility" ? (
          <section className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <div className="mt-8"><MapSelector /></div>
          </section>
        ) : null}

        {currentStep === "basics" ? (
          <section className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <div className="mt-8">
              <CounterInput label="Guests" value={draft.guests} min={1} onChange={(guests) => updateDraft({ guests })} />
              <CounterInput label="Bedrooms" value={draft.bedrooms} onChange={(bedrooms) => updateDraft({ bedrooms })} />
              <CounterInput label="Beds" value={draft.beds} min={1} onChange={(beds) => updateDraft({ beds })} />
              <CounterInput label="Bathrooms" value={draft.bathrooms} min={1} onChange={(bathrooms) => updateDraft({ bathrooms })} />
            </div>
          </section>
        ) : null}

        {currentStep === "rooms" ? (
          <section className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold">{step.title}</h1>
                <p className="mt-2 max-w-2xl text-black/60">{step.description}</p>
              </div>
              <button
                type="button"
                onClick={addRoom}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#083f35] px-4 text-sm font-semibold text-white transition hover:bg-[#062f28]"
              >
                <Plus size={16} /> Add room
              </button>
            </div>

            <div className="mt-8 grid gap-4">
              {draft.rooms.map((room) => (
                <section key={room.id} className={`rounded-3xl border p-5 ${room.active ? "border-black bg-white" : "border-black/10 bg-black/[0.02]"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={room.active}
                        onChange={(event) => updateRoom(room.id, { active: event.target.checked })}
                        className="mt-1 h-5 w-5"
                      />
                      <span>
                        <span className="flex items-center gap-2 font-semibold"><BedDouble size={18} /> {room.name || "Room"}</span>
                        <span className="mt-1 block text-sm text-black/55">{room.floor || "No floor set"} &middot; {room.capacity} pax</span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeRoom(room.id)}
                      className="grid size-10 place-items-center rounded-full text-black/45 transition hover:bg-black/[0.05] hover:text-black"
                      aria-label={`Remove ${room.name || "room"}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="lg:col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Room name</span>
                      <input value={room.name} onChange={(event) => updateRoom(room.id, { name: event.target.value })} className="min-h-12 w-full rounded-xl border px-3" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Floor</span>
                      <input value={room.floor} onChange={(event) => updateRoom(room.id, { floor: event.target.value })} className="min-h-12 w-full rounded-xl border px-3" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Capacity</span>
                      <input type="number" min={1} value={room.capacity} onChange={(event) => updateRoom(room.id, { capacity: Number(event.target.value) })} className="min-h-12 w-full rounded-xl border px-3" />
                    </label>
                    <label className="lg:col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Room amenities</span>
                      <input value={joinCsv(room.amenities)} onChange={(event) => updateRoom(room.id, { amenities: splitCsv(event.target.value) })} className="min-h-12 w-full rounded-xl border px-3" placeholder="Smart TV, Air conditioning" />
                    </label>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Room photos</span>
                      <RoomPhotoUploader
                        photos={room.photos}
                        roomName={room.name}
                        csrfToken={csrfToken}
                        onChange={(photos) => updateRoom(room.id, { photos })}
                      />
                    </div>
                    <label className="sm:col-span-2 lg:col-span-4">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Description</span>
                      <textarea value={room.description} onChange={(event) => updateRoom(room.id, { description: event.target.value })} rows={2} className="w-full rounded-xl border p-3" />
                    </label>
                  </div>
                </section>
              ))}
            </div>
          </section>
        ) : null}

        {currentStep === "amenities" ? (
          <section className="mx-auto max-w-4xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <div className="mt-8 space-y-8">
              {amenityGroups.map((group) => (
                <section key={group.id}>
                  <h2 className="mb-4 text-xl font-semibold">{group.title}</h2>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {group.items.map((item) => (
                      <AmenityCard key={item.id} selected={selectedAmenities.has(item.id)} title={item.label} icon={<DynamicIcon name={item.icon} />} onClick={() => toggleAmenity(item.id)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ) : null}

        {currentStep === "photos" ? (
          <section className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <div className="mt-6"><UploadCard /></div>
            <div className="mt-5"><ImageUploader csrfToken={csrfToken} /></div>
          </section>
        ) : null}

        {currentStep === "title" ? (
          <section className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <textarea value={draft.title} onChange={(event) => updateDraft({ title: event.target.value.slice(0, 50) })} className="mt-8 min-h-48 w-full rounded-3xl border p-5 text-2xl outline-none focus:border-black" />
            <p className="mt-2 text-sm font-semibold text-black/60">{titleRemaining}/50</p>
          </section>
        ) : null}

        {currentStep === "description" ? (
          <section className="mx-auto max-w-2xl">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">Listing story</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{step.title}</h1>
              <p className="mt-3 text-base leading-7 text-black/60">{step.description}</p>
            </div>
            <HighlightPicker />
            <div className="mt-6"><DescriptionInput /></div>
          </section>
        ) : null}

        {currentStep === "virtual-tour" ? (
          <section className="mx-auto max-w-2xl">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">Listing walkthrough</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{step.title}</h1>
              <p className="mt-3 text-base leading-7 text-black/60">{step.description}</p>
            </div>

            <label className="mt-8 block rounded-3xl border border-black/10 bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
              <span className="text-sm font-semibold text-black/70">Virtual tour URL</span>
              <input
                type="url"
                value={draft.virtualTourUrl}
                onChange={(event) => updateDraft({ virtualTourUrl: event.target.value })}
                className={`mt-3 min-h-14 w-full rounded-2xl border px-4 outline-none focus:border-black ${
                  virtualTourUrlValid ? "border-black/10" : "border-red-300 bg-red-50/40"
                }`}
                placeholder="https://my.matterport.com/show/?m=..."
              />
              <span className="mt-2 block text-sm leading-6 text-black/55">Optional. Supported embed links include Matterport, Kuula, YouTube 360, Vimeo, and CloudPano.</span>
              {!virtualTourUrlValid ? <span className="mt-2 block text-sm font-medium text-red-700">Use a valid http or https virtual tour link, or leave this blank.</span> : null}
            </label>

            <div className="mt-5 rounded-3xl border border-[#083f35]/10 bg-[#083f35]/5 p-5">
              <p className="font-semibold text-[#083f35]">Where it appears</p>
              <p className="mt-2 text-sm leading-6 text-black/60">After the listing is approved, guests will see a Virtual tour section inside the listing page between the gallery and amenities.</p>
            </div>
          </section>
        ) : null}

        {currentStep === "highlights" ? (
          <section className="mx-auto max-w-2xl">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">Step 2 · Personality</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{step.title}</h1>
              <p className="mt-3 text-base leading-7 text-black/60">{step.description}</p>
            </div>
            <HighlightPicker />
          </section>
        ) : null}

        {currentStep === "booking" ? (
          <section className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <h2 className="mt-8 text-xl font-semibold">What can guests book?</h2>
            <div className="mt-4 grid gap-3">
              <OptionCard selected={draft.bookingType === "stay"} title="Stay bookings only" description="Guests reserve dates and guests using classic nightly booking." icon={<DynamicIcon name="house" />} onClick={() => updateDraft({ bookingType: "stay", pricingMode: "simple" })} />
              <OptionCard selected={draft.bookingType === "package"} title="Package bookings only" description="Guests must choose an overnight, daytime, event, or custom package." icon={<DynamicIcon name="layers" />} onClick={() => updateDraft({ bookingType: "package", pricingMode: "packages", bookingPackages: bookingPackagesForPrices(draft.basePrice, draft.weekendPrice) })} />
              <OptionCard selected={draft.bookingType === "both"} title="Stay and package bookings" description="Offer traditional stays plus packages on the same listing." icon={<DynamicIcon name="sparkles" />} onClick={() => updateDraft({ bookingType: "both", pricingMode: "packages", bookingPackages: bookingPackagesForPrices(draft.basePrice, draft.weekendPrice) })} />
            </div>
            <h2 className="mt-8 text-xl font-semibold">How are reservations confirmed?</h2>
            <div className="mt-4 grid gap-3">
              <OptionCard selected={draft.bookingMode === "request"} title="Approve your first 3 bookings" description="Start by reviewing reservation requests, then switch later if you want." icon={<DynamicIcon name="calendar" />} onClick={() => updateDraft({ bookingMode: "request" })} />
              <OptionCard selected={draft.bookingMode === "instant"} title="Use Instant Book" description="Let guests book automatically." icon={<DynamicIcon name="sparkles" />} onClick={() => updateDraft({ bookingMode: "instant" })} />
            </div>
          </section>
        ) : null}

        {currentStep === "pricing" ? (
          <section className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => updateDraft({ bookingType: "stay", pricingMode: "simple" })}
                className={`rounded-2xl border p-5 text-left transition ${draft.pricingMode === "simple" ? "border-2 border-black bg-black text-white" : "border-black/10 bg-white hover:border-black/30"}`}
              >
                <span className="block font-semibold">Simple nightly pricing</span>
                <span className={`mt-2 block text-sm ${draft.pricingMode === "simple" ? "text-white/70" : "text-black/60"}`}>Use one weekday and one weekend rate.</span>
              </button>
              <button
                type="button"
                onClick={() => updateDraft({ bookingType: draft.bookingType === "stay" ? "both" : draft.bookingType, pricingMode: "packages", bookingPackages: bookingPackagesForPrices(draft.basePrice, draft.weekendPrice) })}
                className={`rounded-2xl border p-5 text-left transition ${draft.pricingMode === "packages" ? "border-2 border-black bg-black text-white" : "border-black/10 bg-white hover:border-black/30"}`}
              >
                <span className="block font-semibold">Booking packages</span>
                <span className={`mt-2 block text-sm ${draft.pricingMode === "packages" ? "text-white/70" : "text-black/60"}`}>Let guests choose overnight, daytime, or custom access.</span>
              </button>
            </div>
            <div className="mt-10 text-center">
              <div className="text-6xl font-semibold sm:text-7xl">PHP {draft.basePrice.toLocaleString()}</div>
              <input
                aria-label="Base price"
                type="range"
                min="500"
                max="20000"
                step="100"
                value={draft.basePrice}
                onChange={(event) => {
                  const basePrice = Number(event.target.value);
                  const weekendPrice = Math.round(basePrice * (1 + draft.weekendPremium / 100));
                  updateDraft({ basePrice, weekendPrice, bookingPackages: bookingPackagesForPrices(basePrice, weekendPrice) });
                }}
                className="mt-10 w-full"
              />
            </div>
            <div className="mt-8 grid gap-4 rounded-3xl border border-black/10 bg-white p-5">
              <h2 className="text-xl font-semibold">Holiday and seasonal stay pricing</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Holiday nightly rate</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.holidayPrice}
                    onChange={(event) => updateDraft({ holidayPrice: Number(event.target.value) })}
                    className="min-h-12 w-full rounded-xl border px-3"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Holiday dates</span>
                  <input
                    value={joinCsv(draft.holidayDates)}
                    onChange={(event) => updateDraft({ holidayDates: splitDateKeys(event.target.value) })}
                    className="min-h-12 w-full rounded-xl border px-3"
                    placeholder="2026-12-24, 2026-12-31"
                  />
                </label>
              </div>
              <label>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Seasonal rate rows</span>
                <textarea
                  value={formatSeasonalRates(draft.seasonalRates)}
                  onChange={(event) => updateDraft({ seasonalRates: parseSeasonalRates(event.target.value, draft.seasonalRates) })}
                  rows={4}
                  className="w-full rounded-xl border p-3 text-sm leading-6"
                  placeholder="Summer | 2026-03-01 | 2026-05-31 | 5000 | 6500 | 7500"
                />
              </label>
            </div>
          </section>
        ) : null}

        {currentStep === "weekend-pricing" ? (
          <section className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <div className="mt-12 text-6xl font-semibold sm:text-7xl">PHP {draft.weekendPrice.toLocaleString()}</div>
            <div className="mx-auto mt-8 max-w-xl">
              <div className="mb-3 flex justify-between text-sm"><span>Weekend premium</span><strong>{draft.weekendPremium}%</strong></div>
              <input
                aria-label="Weekend premium"
                type="range"
                min="0"
                max="99"
                value={draft.weekendPremium}
                onChange={(event) => {
                  const weekendPremium = Number(event.target.value);
                  const weekendPrice = Math.round(draft.basePrice * (1 + weekendPremium / 100));
                  updateDraft({ weekendPremium, weekendPrice, bookingPackages: bookingPackagesForPrices(draft.basePrice, weekendPrice) });
                }}
                className="w-full"
              />
            </div>
          </section>
        ) : null}

        {currentStep === "booking-packages" ? (
          <section className="mx-auto max-w-4xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 max-w-2xl text-black/60">{step.description}</p>
            {draft.pricingMode === "simple" ? (
              <div className="mt-8 rounded-2xl border border-black/10 bg-black/[0.03] p-5 text-black/65">
                Simple nightly pricing is selected, so guests will book using your weekday and weekend rates.
              </div>
            ) : (
              <div className="mt-8 grid gap-5">
                {draft.bookingPackages.map((pkg) => (
                  <section key={pkg.id} className={`rounded-3xl border p-5 ${pkg.enabled ? "border-black bg-white" : "border-black/10 bg-black/[0.02]"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={pkg.enabled}
                          onChange={(event) => updateBookingPackage(pkg.id, { enabled: event.target.checked })}
                          className="mt-1 h-5 w-5"
                        />
                        <span>
                          <span className="block font-semibold">{pkg.name}</span>
                          <span className="mt-1 block text-sm text-black/55">{pkg.accessType}</span>
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={pkg.unit}
                          onChange={(event) => updateBookingPackage(pkg.id, { unit: event.target.value as HostBookingPackageDraft["unit"] })}
                          className="min-h-11 rounded-xl border px-3 text-sm"
                        >
                          <option value="night">Counts by night</option>
                          <option value="day">Counts by day</option>
                        </select>
                        <select
                          value={pkg.status}
                          onChange={(event) => updateBookingPackage(pkg.id, { status: event.target.value as HostBookingPackageDraft["status"] })}
                          className="min-h-11 rounded-xl border px-3 text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        ["name", "Package name", "text"],
                        ["accessType", "Access", "text"],
                        ["description", "Description", "text"],
                        ["weekdayRate", "Weekday rate", "number"],
                        ["weekendRate", "Weekend rate", "number"],
                        ["holidayRate", "Holiday rate", "number"],
                        ["includedGuests", "Included guests", "number"],
                        ["maxGuests", "Max guests", "number"],
                        ["sleepingCapacity", "Sleeping capacity", "number"],
                        ["durationHours", "Duration hours", "number"],
                        ["additionalGuestFee", "Extra head fee", "number"],
                        ["extensionHourlyFee", "Extension / hour", "number"],
                        ["minimumAdvanceBookingDays", "Advance days", "number"],
                        ["displayOrder", "Display order", "number"],
                        ["checkInTime", "Start / check-in", "text"],
                        ["checkOutTime", "End / check-out", "text"],
                      ].map(([key, label, type]) => (
                        <label key={key} className={key === "name" || key === "accessType" || key === "description" ? "lg:col-span-2" : ""}>
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">{label}</span>
                          <input
                            value={String(pkg[key as keyof HostBookingPackageDraft])}
                            type={type}
                            min={type === "number" ? 0 : undefined}
                            onChange={(event) => {
                              const value = type === "number" ? Number(event.target.value) : event.target.value;
                              updateBookingPackage(pkg.id, { [key]: value } as Partial<HostBookingPackageDraft>);
                            }}
                            className="min-h-12 w-full rounded-xl border px-3"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <fieldset className="rounded-2xl border border-black/10 p-4">
                        <legend className="px-1 text-sm font-semibold">Accessible floors</legend>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {availableFloors.map((floor) => (
                            <label key={floor} className="cursor-pointer rounded-full bg-[#fbf7f2] px-3 py-2 text-sm">
                              <input
                                type="checkbox"
                                checked={pkg.accessibleFloors.includes(floor)}
                                onChange={() => togglePackageListValue(pkg.id, "accessibleFloors", floor)}
                                className="mr-2"
                              />
                              {floor}
                            </label>
                          ))}
                        </div>
                        <input
                          value={joinCsv(pkg.accessibleFloors)}
                          onChange={(event) => updateCsvList(pkg.id, "accessibleFloors", event.target.value)}
                          className="mt-3 min-h-11 w-full rounded-xl border px-3 text-sm"
                          placeholder="Ground Floor, Second Floor"
                        />
                      </fieldset>

                      <fieldset className="rounded-2xl border border-black/10 p-4">
                        <legend className="px-1 text-sm font-semibold">Accessible rooms</legend>
                        <div className="mt-3 grid gap-2">
                          {activeRooms.length ? activeRooms.map((room) => (
                            <label key={room.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#fbf7f2] px-3 py-2 text-sm">
                              <span>{room.name} <span className="text-black/45">({room.floor})</span></span>
                              <input
                                type="checkbox"
                                checked={pkg.accessibleRoomIds.includes(room.id)}
                                onChange={() => togglePackageListValue(pkg.id, "accessibleRoomIds", room.id)}
                              />
                            </label>
                          )) : <p className="text-sm text-black/55">No active rooms yet.</p>}
                        </div>
                      </fieldset>

                      <fieldset className="rounded-2xl border border-black/10 p-4">
                        <legend className="px-1 text-sm font-semibold">Included amenities</legend>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedAmenityLabels.map((amenity) => (
                            <label key={amenity} className="cursor-pointer rounded-full bg-[#fbf7f2] px-3 py-2 text-sm">
                              <input
                                type="checkbox"
                                checked={pkg.includedAmenities.includes(amenity)}
                                onChange={() => togglePackageListValue(pkg.id, "includedAmenities", amenity)}
                                className="mr-2"
                              />
                              {amenity}
                            </label>
                          ))}
                        </div>
                        <input
                          value={joinCsv(pkg.includedAmenities)}
                          onChange={(event) => updateCsvList(pkg.id, "includedAmenities", event.target.value)}
                          className="mt-3 min-h-11 w-full rounded-xl border px-3 text-sm"
                          placeholder="Heated pool, Karaoke, WiFi"
                        />
                      </fieldset>

                      <fieldset className="rounded-2xl border border-black/10 p-4">
                        <legend className="px-1 text-sm font-semibold">Excluded amenities or spaces</legend>
                        <input
                          value={joinCsv(pkg.excludedAmenities)}
                          onChange={(event) => updateCsvList(pkg.id, "excludedAmenities", event.target.value)}
                          className="mt-3 min-h-11 w-full rounded-xl border px-3 text-sm"
                          placeholder="Bedrooms, Second floor access"
                        />
                      </fieldset>

                      <fieldset className="rounded-2xl border border-black/10 p-4">
                        <legend className="px-1 text-sm font-semibold">Holiday dates</legend>
                        <input
                          value={joinCsv(pkg.holidayDates ?? [])}
                          onChange={(event) => updateBookingPackage(pkg.id, { holidayDates: splitDateKeys(event.target.value) })}
                          className="mt-3 min-h-11 w-full rounded-xl border px-3 text-sm"
                          placeholder="2026-12-24, 2026-12-31"
                        />
                      </fieldset>

                      <fieldset className="rounded-2xl border border-black/10 p-4">
                        <legend className="px-1 text-sm font-semibold">Seasonal package rates</legend>
                        <textarea
                          value={formatSeasonalRates(pkg.seasonalRates ?? [])}
                          onChange={(event) => updateBookingPackage(pkg.id, { seasonalRates: parseSeasonalRates(event.target.value, pkg.seasonalRates ?? []) })}
                          rows={4}
                          className="mt-3 w-full rounded-xl border p-3 text-sm leading-6"
                          placeholder="Peak season | 2026-03-01 | 2026-05-31 | 18000 | 22000 | 25000"
                        />
                      </fieldset>

                      <fieldset className="rounded-2xl border border-black/10 p-4">
                        <legend className="px-1 text-sm font-semibold">Available days</legend>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {weekdayOptions.map(([label, value]) => (
                            <label key={value} className="cursor-pointer rounded-full bg-[#fbf7f2] px-3 py-2 text-sm">
                              <input
                                type="checkbox"
                                checked={pkg.availableDays.includes(value)}
                                onChange={() => toggleAvailableDay(pkg.id, value)}
                                className="mr-2"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <fieldset className="rounded-2xl border border-black/10 p-4">
                        <legend className="px-1 text-sm font-semibold">Package conflicts</legend>
                        <div className="mt-3 grid gap-2">
                          {draft.bookingPackages.filter((item) => item.id !== pkg.id).map((item) => (
                            <label key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#fbf7f2] px-3 py-2 text-sm">
                              <span>{item.name}</span>
                              <input
                                type="checkbox"
                                checked={pkg.blockedPackageIds.includes(item.id)}
                                onChange={() => togglePackageListValue(pkg.id, "blockedPackageIds", item.id)}
                              />
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {currentStep === "discounts" ? (
          <section className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <div className="mt-8 grid gap-3">
              {[
                ["newListing", "20%", "New listing promotion", "Offer 20% off your first 3 bookings"],
                ["lastMinute", "3%", "Last-minute discount", "For stays booked 14 days or less before arrival"],
                ["weekly", "10%", "Weekly discount", "For stays of 7 nights or more"],
                ["monthly", "20%", "Monthly discount", "For stays of 28 nights or more"],
              ].map(([key, pct, title, description]) => (
                <label key={key} className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                  <span className="flex items-center gap-4">
                    <strong className="rounded-xl border px-3 py-2">{pct}</strong>
                    <span><span className="block font-semibold">{title}</span><span className="text-sm text-black/60">{description}</span></span>
                  </span>
                  <input type="checkbox" checked={draft.discounts[key as keyof typeof draft.discounts]} onChange={(event) => updateDraft({ discounts: { ...draft.discounts, [key]: event.target.checked } })} className="h-5 w-5" />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {currentStep === "safety" ? (
          <section className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <div className="mt-8 divide-y rounded-3xl border">
              {[
                ["exteriorCamera", "Exterior security camera present"],
                ["noiseMonitor", "Noise decibel monitor present"],
                ["weapons", "Weapon(s) on the property"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between p-5">
                  <span>{label}</span>
                  <input type="checkbox" checked={draft.safetyDisclosures[key as keyof typeof draft.safetyDisclosures]} onChange={(event) => updateDraft({ safetyDisclosures: { ...draft.safetyDisclosures, [key]: event.target.checked } })} className="h-5 w-5" />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {currentStep === "final-details" ? (
          <section className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-semibold">{step.title}</h1>
            <p className="mt-2 text-black/60">{step.description}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                ["unit", "Unit / level"], ["building", "Building name"], ["street", "Street address"], ["barangay", "Barangay"],
                ["city", "City / municipality"], ["zipCode", "ZIP code"], ["province", "Province"],
              ].map(([key, label]) => (
                <label key={key} className={key === "street" ? "sm:col-span-2" : ""}>
                  <span className="mb-2 block text-sm font-medium">{label}</span>
                  <input value={draft.residentialAddress[key as keyof typeof draft.residentialAddress]} onChange={(event) => updateDraft({ residentialAddress: { ...draft.residentialAddress, [key]: event.target.value } })} className="min-h-14 w-full rounded-2xl border px-4" />
                </label>
              ))}
            </div>
            <div className="mt-8">
              <p className="font-semibold">Are you hosting as a business?</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  [true, "Yes"],
                  [false, "No"],
                ].map(([value, label]) => {
                  const selected = draft.hostAsBusiness === value;

                  return (
                    <button
                      key={label as string}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateDraft({ hostAsBusiness: value as boolean })}
                      className={`min-h-14 rounded-2xl border px-4 font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 active:scale-[0.98] ${
                        selected
                          ? "border-black bg-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.16)]"
                          : "border-black/10 bg-white text-black hover:-translate-y-0.5 hover:border-black/30 hover:bg-black/[0.03] hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {currentStep === "review" ? (
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_28rem]">
            <div>
              <h1 className="text-3xl font-semibold">{step.title}</h1>
              <p className="mt-2 text-black/60">{step.description}</p>
              <div className="mt-8 grid gap-3">
                {[
                  ["Location", `${draft.city || "City"}, ${draft.province || "Province"}`],
                  ["Capacity", `${draft.guests} guests · ${draft.bedrooms} bedrooms · ${draft.beds} beds`],
                  ["Amenities", `${draft.amenityIds.length} selected`],
                  ["Photos", `${draft.photos.length} uploaded`],
                  ["Virtual tour", draft.virtualTourUrl.trim() ? "Added" : "Not added"],
                  ["Pricing", `PHP ${draft.basePrice.toLocaleString()} weekday · PHP ${draft.weekendPrice.toLocaleString()} weekend`],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border p-4"><strong className="block">{label}</strong><span className="text-black/60">{value}</span></div>)}
              </div>
            </div>
            <ListingPreviewCard />
          </section>
        ) : null}

        {currentStep === "publish" ? (
          <section className="mx-auto max-w-2xl text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-rose-50 text-4xl">?</div>
            <h1 className="mt-6 text-4xl font-semibold">{step.title}</h1>
            <p className="mt-3 text-black/60">{step.description}</p>
            <button
              type="button"
              onClick={submitListing}
              disabled={isPublishing}
              aria-busy={isPublishing}
              className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#083f35] px-8 font-semibold text-white transition hover:bg-[#062f28] disabled:cursor-not-allowed disabled:bg-[#083f35]/70"
            >
              {isPublishing ? <span className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" /> : null}
              {isPublishing ? "Publishing..." : "Publish listing"}
            </button>
            {isPublishing ? <p className="mt-3 text-sm text-black/55" role="status">Submitting your listing for approval...</p> : null}
            {publishError ? <p className="mx-auto mt-3 max-w-md text-sm font-medium text-rose-700" role="alert">{publishError}</p> : null}
          </section>
        ) : null}
      </StepTransition>
    </StepLayout>
  );
}
