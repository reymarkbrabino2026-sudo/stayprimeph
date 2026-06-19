"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { assertValidCsrfForm, assertValidCsrfToken } from "@/lib/csrf";
import { env } from "@/lib/env";
import { amenityGroups } from "@/lib/host-wizard-data";
import { createPropertyInDatabase, deleteDraftPropertyInDatabase, upsertDraftPropertyInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { hostListingSchema, type HostListingInput } from "@/lib/host-wizard-schema";
import { calculateDefaultWeekendPrice } from "@/lib/pricing";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { isIntendedListingPhotoUrl } from "@/lib/upload-paths";
import type { Property } from "@/lib/types";

const textValue = (max: number, fallback = "") =>
  z.preprocess((value) => typeof value === "string" ? value.trim() : fallback, z.string().max(max)).catch(fallback);

const numberValue = (min: number, max: number, fallback: number) =>
  z.preprocess((value) => Number(value), z.number().min(min).max(max)).catch(fallback);

const integerValue = (min: number, max: number, fallback: number) =>
  z.preprocess((value) => Number(value), z.number().int().min(min).max(max)).catch(fallback);

const draftBookingPackageSchema = z.object({
  id: textValue(80),
  name: textValue(80),
  accessType: textValue(120),
  unit: z.enum(["night", "day"]).catch("night"),
  weekdayRate: integerValue(1, 1000000, 1),
  weekendRate: integerValue(0, 1000000, 0),
  holidayRate: integerValue(0, 1000000, 0),
  includedGuests: integerValue(1, 500, 1),
  maxGuests: integerValue(1, 500, 1),
  additionalGuestFee: integerValue(0, 1000000, 0),
  extensionHourlyFee: integerValue(0, 1000000, 0),
  checkInTime: textValue(40),
  checkOutTime: textValue(40),
  enabled: z.boolean().catch(false),
}).transform((value) => ({
  ...value,
  maxGuests: Math.max(value.maxGuests, value.includedGuests),
}));

const hostListingDraftSaveSchema = z.object({
  uploadScopeId: textValue(120),
  country: textValue(80, "Philippines"),
  street: textValue(160),
  barangay: textValue(80),
  city: textValue(80),
  province: textValue(80),
  zipCode: textValue(16),
  latitude: numberValue(-90, 90, 14.5995),
  longitude: numberValue(-180, 180, 120.9842),
  locationConfirmed: z.boolean().catch(false),
  locationConfirmedAddress: textValue(600),
  propertyType: textValue(80),
  privacyType: textValue(80),
  preciseLocation: z.boolean().catch(false),
  guests: integerValue(1, 50, 1),
  bedrooms: integerValue(0, 50, 0),
  beds: integerValue(1, 100, 1),
  bathrooms: numberValue(1, 50, 1),
  amenityIds: z.array(z.string().max(80)).max(50).catch([]),
  photos: z.array(z.object({
    id: textValue(160),
    url: textValue(2048),
    name: textValue(180),
    size: integerValue(0, 10 * 1024 * 1024, 0),
    isCover: z.boolean().catch(false),
  })).max(20).catch([]),
  title: textValue(50),
  highlights: z.array(z.string().max(80)).max(2).catch([]),
  description: textValue(500),
  bookingMode: z.enum(["request", "instant"]).catch("request"),
  pricingMode: z.enum(["simple", "packages"]).catch("simple"),
  basePrice: integerValue(1, 1000000, 1),
  weekendPrice: integerValue(1, 1000000, 1),
  weekendPremium: integerValue(0, 99, 0),
  cleaningFee: integerValue(0, 1000000, 0),
  securityDeposit: integerValue(0, 1000000, 0),
  currency: textValue(8, "PHP"),
  cancellationPolicy: z.enum(["flexible", "moderate", "strict"]).catch("flexible"),
  discounts: z.object({
    newListing: z.boolean().catch(false),
    lastMinute: z.boolean().catch(false),
    weekly: z.boolean().catch(false),
    monthly: z.boolean().catch(false),
  }).catch({ newListing: false, lastMinute: false, weekly: false, monthly: false }),
  safetyDisclosures: z.object({
    exteriorCamera: z.boolean().catch(false),
    noiseMonitor: z.boolean().catch(false),
    weapons: z.boolean().catch(false),
  }).catch({ exteriorCamera: false, noiseMonitor: false, weapons: false }),
  residentialAddress: z.object({
    unit: textValue(80),
    building: textValue(120),
    street: textValue(160),
    barangay: textValue(80),
    city: textValue(80),
    zipCode: textValue(16),
    province: textValue(80),
  }).catch({ unit: "", building: "", street: "", barangay: "", city: "", zipCode: "", province: "" }),
  hostAsBusiness: z.boolean().nullable().catch(null),
  status: z.enum(["draft", "pending", "published"]).catch("draft"),
  bookingPackages: z.array(draftBookingPackageSchema).max(8).catch([]),
});

type HostListingDraftSaveInput = z.infer<typeof hostListingDraftSaveSchema>;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function numberFrom(formData: FormData, key: string) {
  return Number(formData.get(key) ?? 0);
}

const amenityLabelById = new Map(
  amenityGroups.flatMap((group) => group.items.map((item) => [item.id, item.label] as const)),
);

function toAmenityLabels(ids: string[]) {
  return ids.map((id) => amenityLabelById.get(id) ?? id);
}

function buildHouseRules(input: Pick<HostListingInput, "safetyDisclosures" | "bookingMode">) {
  const rules = ["No smoking", "No parties or events", "Quiet hours after 10 PM"];
  if (input.safetyDisclosures.exteriorCamera) rules.push("Exterior security camera present");
  if (input.safetyDisclosures.noiseMonitor) rules.push("Noise decibel monitor present");
  if (input.safetyDisclosures.weapons) rules.push("Weapon(s) on the property");
  if (input.bookingMode === "instant") rules.push("Instant book enabled");
  return rules;
}

function formatListingAddress(input: Pick<HostListingInput, "street" | "barangay" | "city" | "province" | "country" | "zipCode"> | Pick<HostListingDraftSaveInput, "street" | "barangay" | "city" | "province" | "country" | "zipCode">) {
  return [input.street, input.barangay, input.city, input.province, input.country, input.zipCode]
    .filter(Boolean)
    .join(", ");
}

function orderedImages(input: Pick<HostListingInput, "photos"> | Pick<HostListingDraftSaveInput, "photos">, propertyId: string) {
  return [...input.photos]
    .sort((a, b) => Number(b.isCover) - Number(a.isCover))
    .map((photo, index) => ({ id: `${propertyId}-photo-${index + 1}`, propertyId, imageUrl: photo.url, tone: "from-rose-100 via-orange-50 to-stone-100" }));
}

function enabledBookingPackages(input: Pick<HostListingInput, "pricingMode" | "bookingPackages"> | Pick<HostListingDraftSaveInput, "pricingMode" | "bookingPackages">) {
  return input.pricingMode === "packages" ? input.bookingPackages.filter((item) => item.enabled) : [];
}

function propertyScopedBookingPackages(input: Pick<HostListingInput, "pricingMode" | "bookingPackages"> | Pick<HostListingDraftSaveInput, "pricingMode" | "bookingPackages">, propertyId: string) {
  return enabledBookingPackages(input).map((item) => ({ ...item, id: `${propertyId}-${item.id}` }));
}

function minimumPackageWeekdayRate(input: Pick<HostListingInput, "pricingMode" | "bookingPackages" | "basePrice"> | Pick<HostListingDraftSaveInput, "pricingMode" | "bookingPackages" | "basePrice">) {
  const packages = enabledBookingPackages(input);
  return packages.length ? Math.min(...packages.map((item) => item.weekdayRate)) : input.basePrice;
}

function minimumPackageWeekendRate(input: Pick<HostListingInput, "pricingMode" | "bookingPackages" | "weekendPrice"> | Pick<HostListingDraftSaveInput, "pricingMode" | "bookingPackages" | "weekendPrice">) {
  const packages = enabledBookingPackages(input);
  if (!packages.length) return input.weekendPrice;
  return Math.min(...packages.map((item) => item.weekendRate > 0 ? item.weekendRate : item.weekdayRate));
}

function draftPropertyIdentity(hostId: string, uploadScopeId: string) {
  const digest = createHash("sha256").update(`${hostId}:${uploadScopeId}`).digest("hex").slice(0, 18);
  return {
    id: `draft-${digest}`,
    slug: `draft-${digest}`,
  };
}

function draftText(value: string, fallback: string) {
  return value.trim() || fallback;
}

function buildDraftProperty(userId: string, listing: HostListingDraftSaveInput, createdAt = new Date().toISOString().slice(0, 10)): Property {
  const identity = draftPropertyIdentity(userId, listing.uploadScopeId || randomUUID());
  const bookingPackages = propertyScopedBookingPackages(listing, identity.id);
  const images = orderedImages(listing, identity.id).filter((image) => image.imageUrl);

  return {
    id: identity.id,
    hostId: userId,
    slug: identity.slug,
    title: draftText(listing.title, "Untitled draft"),
    description: draftText(listing.description, "Draft listing saved from the host setup wizard."),
    address: draftText([listing.street, listing.barangay].filter(Boolean).join(", "), "Address pending"),
    city: draftText(listing.city, "City pending"),
    country: draftText(listing.country, "Philippines"),
    barangay: listing.barangay || undefined,
    province: listing.province || undefined,
    zipCode: listing.zipCode || undefined,
    latitude: listing.latitude,
    longitude: listing.longitude,
    preciseLocation: listing.preciseLocation,
    pricePerNight: minimumPackageWeekdayRate(listing),
    weekendPrice: minimumPackageWeekendRate(listing),
    cleaningFee: listing.cleaningFee,
    securityDeposit: listing.securityDeposit,
    currency: listing.currency || "PHP",
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    maxGuests: bookingPackages.length ? Math.max(...bookingPackages.map((item) => item.maxGuests)) : listing.guests,
    propertyType: draftText(listing.propertyType, "Property"),
    status: "draft",
    rating: 0,
    amenities: toAmenityLabels(listing.amenityIds),
    rules: buildHouseRules(listing),
    createdAt,
    images: images.length ? images : [{ id: `${identity.id}-placeholder`, propertyId: identity.id, imageUrl: "pending-upload", tone: "from-rose-100 via-orange-50 to-stone-100" }],
    discounts: listing.discounts,
    bookingPackages,
  };
}

async function requireHost() {
  await assertTrustedRequestOrigin();

  const user = await requireRole("host", {
    redirectTo: "/login?role=host",
    forbiddenMessage: "Only hosts can create listings.",
  });
  requireVerifiedEmail(user);
  return user;
}

export async function createListing(formData: FormData) {
  const user = await requireHost();
  await assertValidCsrfForm(formData);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const propertyType = String(formData.get("propertyType") ?? "House").trim();
  const pricePerNight = numberFrom(formData, "pricePerNight");
  const weekendPriceInput = numberFrom(formData, "weekendPrice");
  const weekendPrice = weekendPriceInput > 0 ? weekendPriceInput : calculateDefaultWeekendPrice(pricePerNight);
  const bedrooms = numberFrom(formData, "bedrooms");
  const bathrooms = numberFrom(formData, "bathrooms");
  const maxGuests = numberFrom(formData, "maxGuests");

  if (!title || !description || !address || !city || !country) throw new Error("Please complete all required listing fields.");

  const id = randomUUID();
  const amenityNames = formData.getAll("amenities").map(String).filter(Boolean);
  const property: Property = {
    id,
    hostId: user.id,
    slug: `${slugify(title)}-${id.slice(0, 8)}`,
    title,
    description,
    address,
    city,
    country,
    pricePerNight,
    weekendPrice,
    bedrooms,
    bathrooms,
    maxGuests,
    propertyType,
    status: "pending",
    rating: 0,
    amenities: amenityNames,
    rules: ["No parties"],
    createdAt: new Date().toISOString().slice(0, 10),
    images: [{ id: randomUUID(), propertyId: id, imageUrl: "pending-upload", tone: "from-rose-100 via-orange-50 to-stone-100" }],
  };
  if (usesPrismaPersistence()) {
    await createPropertyInDatabase(property);
  } else {
    const storedProperties = await readStoredProperties();
    await writeStoredProperties([property, ...storedProperties]);
  }
  revalidatePath("/host/listings");
  revalidatePath("/search");
  redirect("/host/listings");
}

export async function saveWizardListingDraft(input: unknown, csrfToken?: string) {
  const user = await requireHost();
  await assertValidCsrfToken(csrfToken);

  const parsed = hostListingDraftSaveSchema.safeParse(input);
  if (!parsed.success) throw new Error("We couldn't save your draft. Please try again.");

  const listing = {
    ...parsed.data,
    uploadScopeId: parsed.data.uploadScopeId || `draft-${randomUUID()}`,
    status: "draft" as const,
  };
  const identity = draftPropertyIdentity(user.id, listing.uploadScopeId);

  if (usesPrismaPersistence()) {
    await upsertDraftPropertyInDatabase(buildDraftProperty(user.id, listing));
  } else {
    const storedProperties = await readStoredProperties();
    const existingDraft = storedProperties.find((property) => property.id === identity.id && property.hostId === user.id && property.status === "draft");
    const property = buildDraftProperty(user.id, listing, existingDraft?.createdAt);
    await writeStoredProperties([
      property,
      ...storedProperties.filter((item) => item.id !== identity.id),
    ]);
  }

  revalidatePath("/host/listings");
  return { status: "draft" as const };
}

export async function publishWizardListing(input: HostListingInput, csrfToken?: string) {
  const user = await requireHost();
  await assertValidCsrfToken(csrfToken);
  const parsed = hostListingSchema.safeParse(input);
  if (!parsed.success) throw new Error("Please complete the required listing details before publishing.");

  const listing = parsed.data;
  if (listing.locationConfirmedAddress !== formatListingAddress(listing)) {
    throw new Error("Please confirm the map pin for the current listing address before publishing.");
  }

  if (!listing.photos.every((photo) => isIntendedListingPhotoUrl(photo.url, {
    userId: user.id,
    listingId: listing.uploadScopeId,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  }))) {
    throw new Error("Listing photos must be uploaded through StayPrimePH before publishing.");
  }

  const id = randomUUID();
  const bookingPackages = propertyScopedBookingPackages(listing, id);
  const property: Property = {
    id,
    hostId: user.id,
    slug: `${slugify(listing.title)}-${id.slice(0, 8)}`,
    title: listing.title,
    description: listing.description,
    address: `${listing.street}, ${listing.barangay}`,
    city: listing.city,
    country: listing.country,
    barangay: listing.barangay,
    province: listing.province,
    zipCode: listing.zipCode,
    latitude: listing.latitude,
    longitude: listing.longitude,
    preciseLocation: listing.preciseLocation,
    pricePerNight: minimumPackageWeekdayRate(listing),
    weekendPrice: minimumPackageWeekendRate(listing),
    cleaningFee: listing.cleaningFee,
    securityDeposit: listing.securityDeposit,
    currency: listing.currency,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    maxGuests: bookingPackages.length ? Math.max(...bookingPackages.map((item) => item.maxGuests)) : listing.guests,
    propertyType: listing.propertyType,
    status: "pending",
    rating: 0,
    amenities: toAmenityLabels(listing.amenityIds),
    rules: buildHouseRules(listing),
    createdAt: new Date().toISOString().slice(0, 10),
    images: orderedImages(listing, id),
    discounts: listing.discounts,
    bookingPackages,
  };
  const draftIdentity = draftPropertyIdentity(user.id, listing.uploadScopeId);
  if (usesPrismaPersistence()) {
    await deleteDraftPropertyInDatabase(user.id, draftIdentity.id);
    await createPropertyInDatabase(property);
  } else {
    const storedProperties = await readStoredProperties();
    await writeStoredProperties([property, ...storedProperties.filter((item) => item.id !== draftIdentity.id)]);
  }
  revalidatePath("/host/listings");
  revalidatePath("/search");
  redirect("/host/listings?published=1");
}
