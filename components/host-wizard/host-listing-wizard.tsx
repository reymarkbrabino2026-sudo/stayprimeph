"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  AlarmSmoke, Armchair, Baby, Bath, BedDouble, BriefcaseMedical, Building, Building2, CarFront, CookingPot, DoorOpen,
  Check, ChevronDown, FireExtinguisher, Flame, Home, Hotel, House, Lamp, Laptop, Layers, Leaf, MapPin, Mic, Palmtree, Projector,
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
import { getHostWizardPricingDisplay, syncedBookingPackagesForPricing } from "@/lib/host-wizard-pricing";
import { hostListingAddressSchema, hostListingSchema } from "@/lib/host-wizard-schema";
import { findAdjacentApplicableHostWizardStep, hostWizardStepAppliesToDraft, isEntirePlacePrivacyType } from "@/lib/host-wizard-steps";
import { getFirstIncompleteHostWizardStep } from "@/lib/host-wizard-validation";
import type { HostBookingPackageDraft, HostListingDraft, HostPropertyRoomDraft, HostSeasonalRateDraft, WizardStepId } from "@/lib/host-wizard-types";
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

const amenityIdByNormalizedLabel = new Map(
  amenityGroups.flatMap((group) => group.items.map((item) => [normalizeAmenityText(item.label), item.id] as const)),
);

const maxAmenities = 50;

function normalizeAmenityText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function cleanAmenityText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function splitCustomAmenityInput(value: string) {
  return value
    .split(/\r?\n|;/)
    .map(cleanAmenityText)
    .filter(Boolean);
}

const weekdayOptions = [
  ["Sun", 0],
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["Sat", 6],
] as const;

type PackageScalarField = {
  key: keyof HostBookingPackageDraft;
  label: string;
  type: "number" | "text";
  min?: number;
  className?: string;
};

const packageBasicFields: PackageScalarField[] = [
  { key: "name", label: "Package name", type: "text", className: "sm:col-span-2" },
  { key: "accessType", label: "Guest access", type: "text", className: "sm:col-span-2" },
  { key: "description", label: "Short description", type: "text", className: "sm:col-span-2" },
];

const packagePricingFields: PackageScalarField[] = [
  { key: "weekdayRate", label: "Weekday rate", type: "number", min: 1 },
  { key: "weekendRate", label: "Weekend rate", type: "number" },
  { key: "holidayRate", label: "Holiday rate", type: "number" },
  { key: "includedGuests", label: "Included guests", type: "number" },
  { key: "maxGuests", label: "Max guests", type: "number" },
  { key: "sleepingCapacity", label: "Sleeping capacity", type: "number" },
  { key: "additionalGuestFee", label: "Extra guest fee", type: "number" },
];

const packageTimingFields: PackageScalarField[] = [
  { key: "durationHours", label: "Length in hours", type: "number" },
  { key: "checkInTime", label: "Start / check-in", type: "text" },
  { key: "checkOutTime", label: "End / check-out", type: "text" },
  { key: "extensionHourlyFee", label: "Extension / hour", type: "number" },
  { key: "minimumAdvanceBookingDays", label: "Advance notice", type: "number" },
];

const packageAdvancedFields: PackageScalarField[] = [
  { key: "displayOrder", label: "Display order", type: "number" },
];

function formatPackageMoney(value: number) {
  return `PHP ${Math.max(0, value || 0).toLocaleString("en-PH")}`;
}

function formatPackageDays(days: number[]) {
  if (days.length === 7) return "Every day";
  return weekdayOptions.filter(([, value]) => days.includes(value)).map(([label]) => label).join(", ");
}

function ChipCheckbox({ checked, label, sublabel, onChange }: { checked: boolean; label: string; sublabel?: string; onChange: () => void }) {
  return (
    <label
      className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
        checked
          ? "border-[#083f35] bg-[#083f35] text-white shadow-sm"
          : "border-black/10 bg-white text-black/70 hover:border-black/25 hover:text-black"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
          checked ? "border-white/30 bg-white text-[#083f35]" : "border-black/20 bg-white text-transparent"
        }`}
        aria-hidden="true"
      >
        <Check className="h-3 w-3" />
      </span>
      <span>
        <span className="block leading-tight">{label}</span>
        {sublabel ? <span className={`block text-xs ${checked ? "text-white/70" : "text-black/45"}`}>{sublabel}</span> : null}
      </span>
    </label>
  );
}

function PackageFieldInput({ pkg, field, onChange }: { pkg: HostBookingPackageDraft; field: PackageScalarField; onChange: (patch: Partial<HostBookingPackageDraft>) => void }) {
  return (
    <label className={field.className}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">{field.label}</span>
      <input
        value={String(pkg[field.key])}
        type={field.type}
        min={field.type === "number" ? field.min ?? 0 : undefined}
        onChange={(event) => {
          const value = field.type === "number" ? Number(event.target.value) : event.target.value;
          onChange({ [field.key]: value } as Partial<HostBookingPackageDraft>);
        }}
        className="min-h-12 w-full rounded-lg border border-black/10 px-3 outline-none transition focus:border-black"
      />
    </label>
  );
}

function DynamicIcon({ name }: { name: keyof typeof iconMap | string }) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? House;
  return <Icon className="h-7 w-7" />;
}

function StepValidationNotice({ title, messages }: { title: string; messages: string[] }) {
  return (
    <section className="mx-auto mb-6 max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-800" role="alert">
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </section>
  );
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

function RoomAmenitiesInput({
  room,
  onChange,
}: {
  room: HostPropertyRoomDraft;
  onChange: (amenities: string[]) => void;
}) {
  const [value, setValue] = useState(() => joinCsv(room.amenities));

  return (
    <input
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        setValue(nextValue);
        onChange(splitCsv(nextValue));
      }}
      className="min-h-12 w-full rounded-xl border px-3"
      placeholder="Smart TV, Air conditioning"
    />
  );
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
  const [customAmenityInput, setCustomAmenityInput] = useState("");
  const [stepValidationNotice, setStepValidationNotice] = useState<{ stepId: WizardStepId; title: string; messages: string[] } | null>(null);
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
      return;
    }

    if (!hostWizardStepAppliesToDraft(currentStep, draft)) {
      const adjacentStep = findAdjacentApplicableHostWizardStep(currentStep, draft, 1) ?? findAdjacentApplicableHostWizardStep(currentStep, draft, -1);
      setStep(adjacentStep?.id ?? "address");
    }
  }, [currentStep, draft, setStep]);

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
  const customAmenities = useMemo(() => draft.amenityIds.filter((id) => !amenityLabelById.has(id)), [draft.amenityIds]);
  const customAmenityLimitReached = draft.amenityIds.length >= maxAmenities;
  const activeRooms = useMemo(() => draft.rooms.filter((room) => room.active), [draft.rooms]);
  const virtualTourUrlValid = isValidVirtualTourUrl(draft.virtualTourUrl);
  const wholePlaceAccessEnabled = isEntirePlacePrivacyType(draft.privacyType);
  const availableFloors = useMemo(
    () => Array.from(new Set(draft.rooms.map((room) => room.floor.trim()).filter(Boolean))),
    [draft.rooms],
  );
  const packageAccessAreaOptions = useMemo(
    () => Array.from(new Set([...availableFloors, ...draft.bookingPackages.flatMap((pkg) => pkg.accessibleFloors)].filter(Boolean))),
    [availableFloors, draft.bookingPackages],
  );
  const packageAmenityOptions = useMemo(
    () => Array.from(new Set([...selectedAmenityLabels, ...draft.bookingPackages.flatMap((pkg) => pkg.includedAmenities)].filter(Boolean))),
    [draft.bookingPackages, selectedAmenityLabels],
  );
  const pricingDisplay = useMemo(
    () => getHostWizardPricingDisplay({
      pricingMode: draft.pricingMode,
      basePrice: draft.basePrice,
      weekendPrice: draft.weekendPrice,
      bookingPackages: draft.bookingPackages,
    }),
    [draft.basePrice, draft.bookingPackages, draft.pricingMode, draft.weekendPrice],
  );
  const { bookablePackages, bookablePackageCount, weekdayPrice: displayedWeekdayPrice, weekendPrice: displayedWeekendPrice } = pricingDisplay;
  const pricingSummary = draft.pricingMode === "packages"
    ? bookablePackages.length
      ? `Packages from ${formatPackageMoney(displayedWeekdayPrice)} weekday · ${formatPackageMoney(displayedWeekendPrice)} weekend`
      : "No enabled package prices yet"
    : `${formatPackageMoney(displayedWeekdayPrice)} weekday · ${formatPackageMoney(displayedWeekendPrice)} weekend`;
  const firstIncompleteStep = useMemo(() => getFirstIncompleteHostWizardStep(draft), [draft]);
  const visibleStepValidationNotice =
    stepValidationNotice?.stepId === currentStep && firstIncompleteStep?.step.id === stepValidationNotice.stepId
      ? { ...stepValidationNotice, messages: firstIncompleteStep.messages }
      : null;

  useEffect(() => {
    if (!initialized || !draft.privacyType || wholePlaceAccessEnabled) return;
    if (draft.bookingType === "stay" && draft.pricingMode === "simple") return;
    updateDraft({ bookingType: "stay", pricingMode: "simple" });
  }, [draft.bookingType, draft.pricingMode, draft.privacyType, initialized, updateDraft, wholePlaceAccessEnabled]);

  function jumpToMissingStep(requirement: NonNullable<typeof firstIncompleteStep>) {
    setStepValidationNotice({
      stepId: requirement.step.id,
      title: `Finish this step: ${requirement.step.title}`,
      messages: requirement.messages,
    });
    setStep(requirement.step.id);

    if (typeof window !== "undefined") {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  }

  function addCustomAmenities(values: string[]) {
    const cleanedValues = values.map(cleanAmenityText).filter(Boolean);
    if (!cleanedValues.length) return;

    updateDraft((currentDraft) => {
      const amenityIds = [...currentDraft.amenityIds];

      for (const value of cleanedValues) {
        const normalized = normalizeAmenityText(value);
        const existingId = amenityIdByNormalizedLabel.get(normalized);
        const nextId = existingId ?? value;
        const alreadySelected = amenityIds.some((id) => normalizeAmenityText(amenityLabelById.get(id) ?? id) === normalized);

        if (!alreadySelected && amenityIds.length < maxAmenities) {
          amenityIds.push(nextId);
        }
      }

      return { amenityIds };
    });
  }

  function submitCustomAmenity() {
    addCustomAmenities(splitCustomAmenityInput(customAmenityInput));
    setCustomAmenityInput("");
  }

  function removeCustomAmenity(value: string) {
    updateDraft((currentDraft) => ({
      amenityIds: currentDraft.amenityIds.filter((id) => id !== value),
    }));
  }

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

    const missingRequirement = getFirstIncompleteHostWizardStep(draft);
    if (missingRequirement) {
      jumpToMissingStep(missingRequirement);
      return;
    }

    const parsed = hostListingSchema.safeParse({ ...draft, status: "pending" });
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Please finish the missing steps before publishing your listing.";
      setPublishError(message);
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

  function selectPrivacyType(privacyType: string) {
    const patch: Partial<HostListingDraft> = { privacyType };
    if (!isEntirePlacePrivacyType(privacyType)) {
      patch.bookingType = "stay";
      patch.pricingMode = "simple";
    }
    updateDraft(patch);
  }

  function updateRoom(id: string, patch: Partial<HostPropertyRoomDraft> | ((room: HostPropertyRoomDraft) => Partial<HostPropertyRoomDraft>)) {
    updateDraft((currentDraft) => ({
      rooms: currentDraft.rooms.map((item) => {
        if (item.id !== id) return item;
        const nextPatch = typeof patch === "function" ? patch(item) : patch;
        return { ...item, ...nextPatch };
      }),
    }));
  }

  function addRoom() {
    const id = `room-${Date.now().toString(36)}`;
    updateDraft((currentDraft) => ({
      rooms: [
        ...currentDraft.rooms,
        {
          id,
          name: "New room",
          capacity: 2,
          floor: currentDraft.rooms.at(-1)?.floor || "Ground Floor",
          description: "",
          photos: [],
          amenities: [],
          active: true,
        },
      ],
    }));
  }

  function removeRoom(id: string) {
    updateDraft((currentDraft) => ({
      rooms: currentDraft.rooms.filter((item) => item.id !== id),
      bookingPackages: currentDraft.bookingPackages.map((item) => ({
        ...item,
        accessibleRoomIds: item.accessibleRoomIds.filter((roomId) => roomId !== id),
      })),
    }));
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

  function selectSimpleNightlyPricing() {
    updateDraft({ bookingType: "stay", pricingMode: "simple" });
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
        {visibleStepValidationNotice ? (
          <StepValidationNotice title={visibleStepValidationNotice.title} messages={visibleStepValidationNotice.messages} />
        ) : null}

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
                <OptionCard key={item.id} selected={draft.privacyType === item.id} title={item.label} description={item.description} icon={<DynamicIcon name={item.icon} />} onClick={() => selectPrivacyType(item.id)} />
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
                      <RoomAmenitiesInput
                        room={room}
                        onChange={(amenities) => updateRoom(room.id, { amenities })}
                      />
                    </label>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Room photos</span>
                      <RoomPhotoUploader
                        photos={room.photos}
                        roomName={room.name}
                        csrfToken={csrfToken}
                        onChange={(photos) => updateRoom(room.id, (currentRoom) => ({
                          photos: typeof photos === "function" ? photos(currentRoom.photos) : photos,
                        }))}
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
            {draft.rooms.length ? (
              <div className="mt-6 flex justify-center pb-4 sm:justify-end">
                <button
                  type="button"
                  onClick={addRoom}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]"
                >
                  <Plus size={16} /> Add room
                </button>
              </div>
            ) : null}
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
              <section className="rounded-2xl border border-dashed border-black/15 bg-black/[0.015] p-4 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Custom amenities</h2>
                    <p className="mt-1 text-sm text-black/55">{draft.amenityIds.length}/{maxAmenities} selected</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={customAmenityInput}
                    onChange={(event) => setCustomAmenityInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitCustomAmenity();
                      }
                    }}
                    disabled={customAmenityLimitReached}
                    className="min-h-12 flex-1 rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-black/[0.04]"
                    placeholder="Extra fridge"
                  />
                  <button
                    type="button"
                    onClick={submitCustomAmenity}
                    disabled={customAmenityLimitReached || !customAmenityInput.trim()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#083f35] px-4 text-sm font-semibold text-white transition hover:bg-[#062f28] disabled:cursor-not-allowed disabled:bg-black/15"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
                {customAmenities.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {customAmenities.map((amenity) => (
                      <span key={amenity} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-medium text-black/75">
                        {amenity}
                        <button
                          type="button"
                          onClick={() => removeCustomAmenity(amenity)}
                          className="grid size-7 place-items-center rounded-full text-black/45 transition hover:bg-black/[0.05] hover:text-black"
                          aria-label={`Remove ${amenity}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                {customAmenityLimitReached ? <p className="mt-3 text-sm font-medium text-rose-700">Amenity limit reached.</p> : null}
              </section>
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
              {wholePlaceAccessEnabled ? (
                <>
                  <OptionCard selected={draft.bookingType === "package"} title="Package bookings only" description="Guests must choose an overnight, daytime, event, or custom package." icon={<DynamicIcon name="layers" />} onClick={() => updateDraft({ bookingType: "package", pricingMode: "packages", bookingPackages: bookingPackagesForPrices(draft.basePrice, draft.weekendPrice) })} />
                  <OptionCard selected={draft.bookingType === "both"} title="Stay and package bookings" description="Offer traditional stays plus packages on the same listing." icon={<DynamicIcon name="sparkles" />} onClick={() => updateDraft({ bookingType: "both", pricingMode: "packages", bookingPackages: bookingPackagesForPrices(draft.basePrice, draft.weekendPrice) })} />
                </>
              ) : null}
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
            <div className="mt-8 grid gap-3">
              <button
                type="button"
                onClick={selectSimpleNightlyPricing}
                className={`rounded-2xl border p-5 text-left transition ${draft.pricingMode === "simple" ? "border-2 border-black bg-black text-white" : "border-black/10 bg-white hover:border-black/30"}`}
              >
                <span className="block font-semibold">Simple nightly pricing</span>
                <span className={`mt-2 block text-sm ${draft.pricingMode === "simple" ? "text-white/70" : "text-black/60"}`}>Use one weekday and one weekend rate.</span>
              </button>
            </div>
            {draft.pricingMode === "simple" ? (
              <>
                <div className="mt-10 text-center">
                  <div className="text-6xl font-semibold sm:text-7xl">PHP {draft.basePrice.toLocaleString()}</div>
                  <input
                    aria-label="Base price"
                    type="range"
                    min="0"
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
              </>
            ) : null}
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
          <section className="mx-auto max-w-5xl">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold">{step.title}</h1>
              <p className="mt-2 text-black/60">{step.description}</p>
            </div>
            {draft.pricingMode === "simple" ? (
              <div className="mt-8 rounded-lg border border-black/10 bg-black/[0.03] p-5 text-black/65">
                Simple nightly pricing is selected, so guests will book using your weekday and weekend rates.
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-black/10 bg-white p-4">
                    <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Bookable</span>
                    <strong className="mt-2 block text-2xl">{bookablePackageCount}</strong>
                  </div>
                  <div className="rounded-lg border border-black/10 bg-white p-4">
                    <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Booking type</span>
                    <strong className="mt-2 block text-base">{draft.bookingType === "both" ? "Stay + packages" : "Packages only"}</strong>
                  </div>
                  <div className="rounded-lg border border-black/10 bg-white p-4">
                    <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">From weekday</span>
                    <strong className="mt-2 block text-base">{formatPackageMoney(displayedWeekdayPrice)}</strong>
                  </div>
                </div>

                <div className="mt-6 grid gap-5">
                  {draft.bookingPackages.map((pkg) => {
                    const packageIsBookable = pkg.enabled && pkg.status !== "inactive";
                    const otherPackages = draft.bookingPackages.filter((item) => item.id !== pkg.id);

                    return (
                      <section key={pkg.id} className={`rounded-lg border p-5 ${packageIsBookable ? "border-black bg-white shadow-sm" : "border-black/10 bg-black/[0.02]"}`}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <label className="flex cursor-pointer items-start gap-3">
                            <span className="sr-only">Offer {pkg.name}</span>
                            <span
                              className={`mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                                pkg.enabled ? "bg-[#083f35]" : "bg-black/15"
                              }`}
                              aria-hidden="true"
                            >
                              <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${pkg.enabled ? "translate-x-6" : "translate-x-1"}`} />
                            </span>
                            <span>
                              <span className="block text-lg font-semibold">{pkg.name || "Untitled package"}</span>
                              <span className="mt-1 block max-w-2xl text-sm text-black/55">
                                {pkg.accessType || "Guest access"} | {formatPackageMoney(pkg.weekdayRate)} weekday | {formatPackageDays(pkg.availableDays)}
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={pkg.enabled}
                              onChange={(event) => updateBookingPackage(pkg.id, { enabled: event.target.checked, status: event.target.checked ? "active" : pkg.status })}
                              className="sr-only"
                            />
                          </label>

                          <div className="grid w-full grid-cols-3 gap-2 text-sm sm:w-auto sm:min-w-[24rem]">
                            <div className="rounded-lg bg-black/[0.03] px-3 py-2">
                              <span className="block text-xs text-black/45">Weekend</span>
                              <strong className="block truncate">{pkg.weekendRate > 0 ? formatPackageMoney(pkg.weekendRate) : "Uses weekday"}</strong>
                            </div>
                            <div className="rounded-lg bg-black/[0.03] px-3 py-2">
                              <span className="block text-xs text-black/45">Guests</span>
                              <strong className="block">{pkg.includedGuests}-{pkg.maxGuests}</strong>
                            </div>
                            <div className="rounded-lg bg-black/[0.03] px-3 py-2">
                              <span className="block text-xs text-black/45">Length</span>
                              <strong className="block">{pkg.durationHours}h</strong>
                            </div>
                          </div>
                        </div>

                        {!pkg.enabled ? (
                          <p className="mt-4 border-t border-black/10 pt-4 text-sm text-black/55">
                            Turn this on when guests can choose this package at checkout.
                          </p>
                        ) : (
                          <div className="mt-6 space-y-6 border-t border-black/10 pt-5">
                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
                              <div className="space-y-6">
                                <div>
                                  <h2 className="text-sm font-semibold">Package basics</h2>
                                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    {packageBasicFields.map((field) => (
                                      <PackageFieldInput key={field.key} pkg={pkg} field={field} onChange={(patch) => updateBookingPackage(pkg.id, patch)} />
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <h2 className="text-sm font-semibold">Guest pricing</h2>
                                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    {packagePricingFields.map((field) => (
                                      <PackageFieldInput key={field.key} pkg={pkg} field={field} onChange={(patch) => updateBookingPackage(pkg.id, patch)} />
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-6">
                                <div>
                                  <h2 className="text-sm font-semibold">Stay window</h2>
                                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Counts by</span>
                                      <span className="grid grid-cols-2 gap-2 rounded-lg bg-black/[0.04] p-1">
                                        {(["night", "day"] as const).map((unit) => (
                                          <button
                                            key={unit}
                                            type="button"
                                            aria-pressed={pkg.unit === unit}
                                            onClick={() => updateBookingPackage(pkg.id, { unit })}
                                            className={`min-h-10 rounded-md px-3 text-sm font-semibold transition ${
                                              pkg.unit === unit ? "bg-white text-black shadow-sm" : "text-black/55 hover:text-black"
                                            }`}
                                          >
                                            {unit === "night" ? "Night" : "Day"}
                                          </button>
                                        ))}
                                      </span>
                                    </div>
                                    {packageTimingFields.map((field) => (
                                      <PackageFieldInput key={field.key} pkg={pkg} field={field} onChange={(patch) => updateBookingPackage(pkg.id, patch)} />
                                    ))}
                                  </div>

                                  <fieldset className="mt-4">
                                    <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Available days</legend>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {weekdayOptions.map(([label, value]) => (
                                        <ChipCheckbox
                                          key={value}
                                          checked={pkg.availableDays.includes(value)}
                                          label={label}
                                          onChange={() => toggleAvailableDay(pkg.id, value)}
                                        />
                                      ))}
                                    </div>
                                  </fieldset>
                                </div>

                                <div>
                                  <h2 className="text-sm font-semibold">Guest access</h2>
                                  <fieldset className="mt-3">
                                    <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Areas</legend>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {packageAccessAreaOptions.length ? packageAccessAreaOptions.map((floor) => (
                                        <ChipCheckbox
                                          key={floor}
                                          checked={pkg.accessibleFloors.includes(floor)}
                                          label={floor}
                                          onChange={() => togglePackageListValue(pkg.id, "accessibleFloors", floor)}
                                        />
                                      )) : <p className="text-sm text-black/55">No floors added yet.</p>}
                                    </div>
                                  </fieldset>

                                  <fieldset className="mt-4">
                                    <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Rooms</legend>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {activeRooms.length ? activeRooms.map((room) => (
                                        <ChipCheckbox
                                          key={room.id}
                                          checked={pkg.accessibleRoomIds.includes(room.id)}
                                          label={room.name}
                                          sublabel={room.floor}
                                          onChange={() => togglePackageListValue(pkg.id, "accessibleRoomIds", room.id)}
                                        />
                                      )) : <p className="text-sm text-black/55">No active rooms yet.</p>}
                                    </div>
                                  </fieldset>

                                  <fieldset className="mt-4">
                                    <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Included amenities</legend>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {packageAmenityOptions.length ? packageAmenityOptions.map((amenity) => (
                                        <ChipCheckbox
                                          key={amenity}
                                          checked={pkg.includedAmenities.includes(amenity)}
                                          label={amenity}
                                          onChange={() => togglePackageListValue(pkg.id, "includedAmenities", amenity)}
                                        />
                                      )) : <p className="text-sm text-black/55">No amenities selected yet.</p>}
                                    </div>
                                  </fieldset>

                                  <label className="mt-4 block">
                                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Not included</span>
                                    <input
                                      value={joinCsv(pkg.excludedAmenities)}
                                      onChange={(event) => updateCsvList(pkg.id, "excludedAmenities", event.target.value)}
                                      className="min-h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none transition focus:border-black"
                                      placeholder="Bedrooms, second floor access"
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>

                            <details className="group border-t border-black/10 pt-5">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-black/75 [&::-webkit-details-marker]:hidden">
                                <span>Advanced rules</span>
                                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
                              </summary>

                              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                                <label>
                                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Package status</span>
                                  <select
                                    value={pkg.status}
                                    onChange={(event) => updateBookingPackage(pkg.id, { status: event.target.value as HostBookingPackageDraft["status"] })}
                                    className="min-h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none transition focus:border-black"
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Paused</option>
                                  </select>
                                </label>

                                {packageAdvancedFields.map((field) => (
                                  <PackageFieldInput key={field.key} pkg={pkg} field={field} onChange={(patch) => updateBookingPackage(pkg.id, patch)} />
                                ))}

                                <label>
                                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Custom areas</span>
                                  <input
                                    value={joinCsv(pkg.accessibleFloors)}
                                    onChange={(event) => updateCsvList(pkg.id, "accessibleFloors", event.target.value)}
                                    className="min-h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none transition focus:border-black"
                                    placeholder="Ground Floor, Outdoor Areas"
                                  />
                                </label>

                                <label>
                                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Custom included amenities</span>
                                  <input
                                    value={joinCsv(pkg.includedAmenities)}
                                    onChange={(event) => updateCsvList(pkg.id, "includedAmenities", event.target.value)}
                                    className="min-h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none transition focus:border-black"
                                    placeholder="Heated pool, Karaoke, WiFi"
                                  />
                                </label>

                                <label>
                                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Holiday dates</span>
                                  <input
                                    value={joinCsv(pkg.holidayDates ?? [])}
                                    onChange={(event) => updateBookingPackage(pkg.id, { holidayDates: splitDateKeys(event.target.value) })}
                                    className="min-h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none transition focus:border-black"
                                    placeholder="2026-12-24, 2026-12-31"
                                  />
                                </label>

                                <fieldset>
                                  <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Cannot overlap with</legend>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {otherPackages.map((item) => (
                                      <ChipCheckbox
                                        key={item.id}
                                        checked={pkg.blockedPackageIds.includes(item.id)}
                                        label={item.name}
                                        onChange={() => togglePackageListValue(pkg.id, "blockedPackageIds", item.id)}
                                      />
                                    ))}
                                  </div>
                                </fieldset>

                                <label className="lg:col-span-2">
                                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Seasonal rates</span>
                                  <textarea
                                    value={formatSeasonalRates(pkg.seasonalRates ?? [])}
                                    onChange={(event) => updateBookingPackage(pkg.id, { seasonalRates: parseSeasonalRates(event.target.value, pkg.seasonalRates ?? []) })}
                                    rows={3}
                                    className="w-full rounded-lg border border-black/10 p-3 text-sm leading-6 outline-none transition focus:border-black"
                                    placeholder="Peak season | 2026-03-01 | 2026-05-31 | 18000 | 22000 | 25000"
                                  />
                                </label>
                              </div>
                            </details>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </>
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
                  ["Pricing", pricingSummary],
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
            <p className="mt-3 text-black/60">
              {firstIncompleteStep ? "A required step still needs attention before your listing can be submitted." : step.description}
            </p>
            {firstIncompleteStep ? (
              <div className="mx-auto mt-5 max-w-md rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-800">
                <p className="font-semibold">{firstIncompleteStep.step.title}</p>
                <p className="mt-1">{firstIncompleteStep.messages[0]}</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={submitListing}
              disabled={isPublishing}
              aria-busy={isPublishing}
              className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#083f35] px-8 font-semibold text-white transition hover:bg-[#062f28] disabled:cursor-not-allowed disabled:bg-[#083f35]/70"
            >
              {isPublishing ? <span className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" /> : null}
              {isPublishing ? "Publishing..." : firstIncompleteStep ? "Go to missing step" : "Publish listing"}
            </button>
            {isPublishing ? <p className="mt-3 text-sm text-black/55" role="status">Submitting your listing for approval...</p> : null}
            {publishError ? <p className="mx-auto mt-3 max-w-md text-sm font-medium text-rose-700" role="alert">{publishError}</p> : null}
          </section>
        ) : null}
      </StepTransition>
    </StepLayout>
  );
}
