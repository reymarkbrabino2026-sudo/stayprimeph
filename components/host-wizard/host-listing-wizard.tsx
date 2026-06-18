"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  AlarmSmoke, Armchair, Baby, Bath, BriefcaseMedical, Building, Building2, CarFront, CookingPot, DoorOpen,
  Check, FireExtinguisher, Flame, Home, Hotel, House, Lamp, Laptop, Layers, Leaf, MapPin, Mic, Palmtree, Projector,
  Puzzle, ShieldAlert, Snowflake, Sofa, Sparkles, Sun, Target, TentTree, Tractor, TreePine, Tv, Umbrella, Users,
  UtensilsCrossed, WashingMachine, Waves, Wifi,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { publishWizardListing } from "@/app/host/listings/actions";
import { AmenityCard, CounterInput, OptionCard } from "@/components/host-wizard/cards";
import { DescriptionInput, ListingPreviewCard } from "@/components/host-wizard/content";
import { ImageUploader, UploadCard } from "@/components/host-wizard/image-uploader";
import { MapSelector } from "@/components/host-wizard/map-selector";
import { StepLayout, StepTransition } from "@/components/host-wizard/step-layout";
import { amenityGroups, highlightOptions, hostWizardSteps, privacyTypes, propertyTypes } from "@/lib/host-wizard-data";
import { hostListingSchema } from "@/lib/host-wizard-schema";
import type { HostBookingPackageDraft } from "@/lib/host-wizard-types";
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

const addressSchema = hostListingSchema.pick({ country: true, street: true, barangay: true, city: true, province: true, zipCode: true });
type AddressValues = z.infer<typeof addressSchema>;

function formatAddressValues(values: AddressValues) {
  return [values.street, values.barangay, values.city, values.province, values.country, values.zipCode]
    .filter(Boolean)
    .join(", ");
}

export function HostListingWizard({ user, csrfToken, freshStart = false }: { user: { id: string; email: string }; csrfToken: string; freshStart?: boolean }) {
  const { ownerUserId, initialized, currentStep, draft, initializeForUser, setStep, updateDraft, toggleAmenity } = useHostWizardStore();
  const step = hostWizardSteps.find((item) => item.id === currentStep) ?? hostWizardSteps[0];

  useEffect(() => {
    initializeForUser(user, { fresh: freshStart });
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

  async function submitListing() {
    const parsed = hostListingSchema.safeParse({ ...draft, status: "pending" });
    if (!parsed.success) {
      alert(draft.locationConfirmed ? "Please finish the missing steps before publishing your listing." : "Please confirm the map pin before publishing your listing.");
      return;
    }
    await publishWizardListing(parsed.data, csrfToken);
  }

  function updateBookingPackage(id: string, patch: Partial<HostBookingPackageDraft>) {
    updateDraft({
      bookingPackages: draft.bookingPackages.map((item) => item.id === id ? { ...item, ...patch } : item),
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
    <StepLayout>
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
            <div className="mt-5"><ImageUploader /></div>
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
            <div className="mt-8 grid gap-3">
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
                onClick={() => updateDraft({ pricingMode: "simple" })}
                className={`rounded-2xl border p-5 text-left transition ${draft.pricingMode === "simple" ? "border-2 border-black bg-black text-white" : "border-black/10 bg-white hover:border-black/30"}`}
              >
                <span className="block font-semibold">Simple nightly pricing</span>
                <span className={`mt-2 block text-sm ${draft.pricingMode === "simple" ? "text-white/70" : "text-black/60"}`}>Use one weekday and one weekend rate.</span>
              </button>
              <button
                type="button"
                onClick={() => updateDraft({ pricingMode: "packages" })}
                className={`rounded-2xl border p-5 text-left transition ${draft.pricingMode === "packages" ? "border-2 border-black bg-black text-white" : "border-black/10 bg-white hover:border-black/30"}`}
              >
                <span className="block font-semibold">Booking packages</span>
                <span className={`mt-2 block text-sm ${draft.pricingMode === "packages" ? "text-white/70" : "text-black/60"}`}>Let guests choose overnight, daytime, or custom access.</span>
              </button>
            </div>
            <div className="mt-10 text-center">
              <div className="text-6xl font-semibold sm:text-7xl">PHP {draft.basePrice.toLocaleString()}</div>
              <input aria-label="Base price" type="range" min="500" max="20000" step="100" value={draft.basePrice} onChange={(event) => updateDraft({ basePrice: Number(event.target.value) })} className="mt-10 w-full" />
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
                  updateDraft({ weekendPremium, weekendPrice: Math.round(draft.basePrice * (1 + weekendPremium / 100)) });
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
                      <select
                        value={pkg.unit}
                        onChange={(event) => updateBookingPackage(pkg.id, { unit: event.target.value as HostBookingPackageDraft["unit"] })}
                        className="min-h-11 rounded-xl border px-3 text-sm"
                      >
                        <option value="night">Counts by night</option>
                        <option value="day">Counts by day</option>
                      </select>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        ["name", "Package name", "text"],
                        ["accessType", "Access", "text"],
                        ["weekdayRate", "Weekday rate", "number"],
                        ["weekendRate", "Weekend rate", "number"],
                        ["includedGuests", "Included guests", "number"],
                        ["maxGuests", "Max guests", "number"],
                        ["additionalGuestFee", "Extra head fee", "number"],
                        ["extensionHourlyFee", "Extension / hour", "number"],
                        ["checkInTime", "Start / check-in", "text"],
                        ["checkOutTime", "End / check-out", "text"],
                      ].map(([key, label, type]) => (
                        <label key={key} className={key === "name" || key === "accessType" ? "lg:col-span-2" : ""}>
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
                <button onClick={() => updateDraft({ hostAsBusiness: true })} className={`min-h-14 rounded-2xl border ${draft.hostAsBusiness === true ? "border-2 border-black" : ""}`}>Yes</button>
                <button onClick={() => updateDraft({ hostAsBusiness: false })} className={`min-h-14 rounded-2xl border ${draft.hostAsBusiness === false ? "border-2 border-black" : ""}`}>No</button>
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
            <button onClick={submitListing} className="mt-8 min-h-14 rounded-2xl bg-[#083f35] px-8 font-semibold text-white">Publish listing</button>
          </section>
        ) : null}
      </StepTransition>
    </StepLayout>
  );
}
