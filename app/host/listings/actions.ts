"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { assertValidCsrfForm, assertValidCsrfToken } from "@/lib/csrf";
import { env } from "@/lib/env";
import { amenityGroups } from "@/lib/host-wizard-data";
import { createPropertyInDatabase, deleteDraftPropertyInDatabase, deletePropertyInDatabase, updatePropertyDetailsInDatabase, upsertDraftPropertyInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredBookings } from "@/lib/booking-store";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { hostListingSchema, type HostListingInput } from "@/lib/host-wizard-schema";
import { normalizeListingPhotoCategory } from "@/lib/listing-photo-categories";
import { normalizeListingVideoUrl } from "@/lib/listing-video";
import { logger } from "@/lib/logger";
import { calculateDefaultWeekendPrice } from "@/lib/pricing";
import { getPropertyById, revalidatePublicListingSummaries } from "@/lib/properties";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { isIntendedListingPhotoUrl } from "@/lib/upload-paths";
import { normalizeVirtualTourUrl } from "@/lib/virtual-tour";
import type { Property } from "@/lib/types";

const protectedListingDeleteMessage = "This listing has active bookings and cannot be deleted. Please resolve those bookings before deleting the listing.";
const genericListingDeleteMessage = "Listing could not be deleted. Please refresh the page and try again.";

const textValue = (max: number, fallback = "") =>
  z.preprocess((value) => typeof value === "string" ? value.trim() : fallback, z.string().max(max)).catch(fallback);

const numberValue = (min: number, max: number, fallback: number) =>
  z.preprocess((value) => Number(value), z.number().min(min).max(max)).catch(fallback);

const integerValue = (min: number, max: number, fallback: number) =>
  z.preprocess((value) => Number(value), z.number().int().min(min).max(max)).catch(fallback);

const dateKeyList = z.array(z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/)).max(80).catch([]);

const virtualTourFormUrl = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : "",
  z.string().max(2048),
).refine((value) => !value || Boolean(normalizeVirtualTourUrl(value)), {
  message: "Enter a valid virtual tour link.",
}).transform((value) => normalizeVirtualTourUrl(value));

const listingVideoFormUrl = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : "",
  z.string().max(4096),
).refine((value) => !value || Boolean(normalizeListingVideoUrl(value)), {
  message: "Paste a valid YouTube or Vimeo video link.",
}).transform((value) => normalizeListingVideoUrl(value));

const seasonalRateDraftSchema = z.object({
  id: textValue(80),
  name: textValue(80),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).catch(""),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).catch(""),
  weekdayRate: integerValue(1, 1000000, 1),
  weekendRate: integerValue(0, 1000000, 0),
  holidayRate: integerValue(0, 1000000, 0),
}).transform((value) => ({
  ...value,
  id: value.id || randomUUID(),
  name: value.name || "Seasonal rate",
}));

const draftBookingPackageSchema = z.object({
  id: textValue(80),
  name: textValue(80),
  description: textValue(300),
  status: z.enum(["active", "inactive"]).catch("active"),
  displayOrder: integerValue(0, 100, 0),
  accessType: textValue(120),
  unit: z.enum(["night", "day"]).catch("night"),
  weekdayRate: integerValue(1, 1000000, 1),
  weekendRate: integerValue(0, 1000000, 0),
  holidayRate: integerValue(0, 1000000, 0),
  holidayDates: dateKeyList,
  seasonalRates: z.array(seasonalRateDraftSchema).max(12).catch([]),
  includedGuests: integerValue(1, 500, 1),
  maxGuests: integerValue(1, 500, 1),
  sleepingCapacity: integerValue(0, 500, 0),
  durationHours: integerValue(1, 168, 21),
  additionalGuestFee: integerValue(0, 1000000, 0),
  extensionHourlyFee: integerValue(0, 1000000, 0),
  checkInTime: textValue(40),
  checkOutTime: textValue(40),
  accessibleFloors: z.array(z.string().trim().min(1).max(80)).max(20).catch([]),
  accessibleRoomIds: z.array(z.string().trim().min(1).max(100)).max(50).catch([]),
  includedAmenities: z.array(z.string().trim().min(1).max(80)).max(80).catch([]),
  excludedAmenities: z.array(z.string().trim().min(1).max(80)).max(80).catch([]),
  availableDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).catch([0, 1, 2, 3, 4, 5, 6]),
  minimumAdvanceBookingDays: integerValue(0, 365, 0),
  blockedPackageIds: z.array(z.string().trim().min(1).max(100)).max(20).catch([]),
  enabled: z.boolean().catch(false),
}).transform((value) => ({
  ...value,
  maxGuests: Math.max(value.maxGuests, value.includedGuests),
}));

const draftRoomSchema = z.object({
  id: textValue(80),
  name: textValue(80),
  capacity: integerValue(1, 100, 1),
  floor: textValue(80),
  description: textValue(300),
  photos: z.array(z.string().trim().max(2048)).max(12).catch([]),
  amenities: z.array(z.string().trim().max(80)).max(30).catch([]),
  active: z.boolean().catch(true),
});

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
  rooms: z.array(draftRoomSchema).max(30).catch([]),
  amenityIds: z.array(z.string().max(80)).max(50).catch([]),
  photos: z.array(z.object({
    id: textValue(160),
    url: textValue(2048),
    name: textValue(180),
    size: integerValue(0, 10 * 1024 * 1024, 0),
    isCover: z.boolean().catch(false),
    category: z.string().max(40).optional().transform((value) => normalizeListingPhotoCategory(value)),
  })).max(20).catch([]),
  title: textValue(50),
  highlights: z.array(z.string().max(80)).max(2).catch([]),
  description: textValue(500),
  virtualTourUrl: textValue(2048).transform((value) => normalizeVirtualTourUrl(value)),
  listingVideoUrl: textValue(4096).transform((value) => normalizeListingVideoUrl(value)),
  bookingType: z.enum(["stay", "package", "both"]).catch("stay"),
  bookingMode: z.enum(["request", "instant"]).catch("request"),
  pricingMode: z.enum(["simple", "packages"]).catch("simple"),
  basePrice: integerValue(1, 1000000, 1),
  weekendPrice: integerValue(1, 1000000, 1),
  holidayPrice: integerValue(0, 1000000, 0),
  holidayDates: dateKeyList,
  seasonalRates: z.array(seasonalRateDraftSchema).max(12).catch([]),
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

const listingFormSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(1000),
  virtualTourUrl: virtualTourFormUrl,
  listingVideoUrl: listingVideoFormUrl,
  address: z.string().trim().min(1).max(240),
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(80),
  propertyType: z.string().trim().min(1).max(80),
  pricePerNight: z.coerce.number().int().min(1).max(1000000),
  weekendPrice: z.coerce.number().int().min(0).max(1000000).optional(),
  cleaningFee: z.coerce.number().int().min(0).max(1000000),
  securityDeposit: z.coerce.number().int().min(0).max(1000000),
  currency: z.string().trim().min(1).max(8),
  bookingType: z.enum(["stay", "package", "both"]).catch("stay"),
  holidayPrice: z.coerce.number().int().min(0).max(1000000).optional(),
  holidayDates: z.array(z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/)).max(80).catch([]),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().min(0).max(50),
  maxGuests: z.coerce.number().int().min(1).max(100),
  amenities: z.array(z.string().trim().max(80)).max(50).catch([]),
});

type HostListingDraftSaveInput = z.infer<typeof hostListingDraftSaveSchema>;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const amenityLabelById = new Map(
  amenityGroups.flatMap((group) => group.items.map((item) => [item.id, item.label] as const)),
);

function toAmenityLabels(ids: string[]) {
  return ids.map((id) => amenityLabelById.get(id) ?? id);
}

function csvDateKeys(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));
}

function textLineValues(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n/)
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function submittedAmenityValues(formData: FormData) {
  const values = [
    ...formData.getAll("amenities"),
    ...textLineValues(formData.get("customAmenities")),
  ]
    .map((item) => typeof item === "string" ? item.trim().replace(/\s+/g, " ") : "")
    .filter(Boolean);

  return Array.from(new Set(values)).slice(0, 50);
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
    .map((photo, index) => ({
      id: `${propertyId}-photo-${index + 1}`,
      propertyId,
      imageUrl: photo.url,
      tone: "from-rose-100 via-orange-50 to-stone-100",
      category: normalizeListingPhotoCategory(photo.category),
    }));
}

function readSubmittedImages(formData: FormData, existing: Property, userId: string) {
  const existingImageUrls = new Set(existing.images.map((image) => image.imageUrl));
  const submittedUrls = formData.getAll("photoUrls").map(String).map((value) => value.trim()).filter(Boolean);
  const submittedCategories = formData.getAll("photoCategories").map((value) => normalizeListingPhotoCategory(String(value)));
  const uniquePhotos: Array<{ url: string; category: ReturnType<typeof normalizeListingPhotoCategory> }> = [];
  const seen = new Set<string>();

  for (const [index, url] of submittedUrls.entries()) {
    if (seen.has(url)) continue;
    seen.add(url);
    uniquePhotos.push({ url, category: submittedCategories[index] ?? "other" });
    if (uniquePhotos.length >= 20) break;
  }

  for (const { url } of uniquePhotos) {
    const retainedExistingPhoto = existingImageUrls.has(url);
    const uploadedForThisListing = isIntendedListingPhotoUrl(url, {
      userId,
      listingId: existing.id,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
    });
    if (!retainedExistingPhoto && !uploadedForThisListing) {
      throw new Error("Listing photos must be uploaded through StayPrimePH before saving.");
    }
  }

  return uniquePhotos.map((photo, index) => ({
    id: `${existing.id}-photo-${index + 1}`,
    propertyId: existing.id,
    imageUrl: photo.url,
    tone: "from-rose-100 via-orange-50 to-stone-100",
    category: photo.category,
  }));
}

function isEntirePlaceListingInput(input: Pick<HostListingInput, "privacyType"> | Pick<HostListingDraftSaveInput, "privacyType">) {
  return input.privacyType === "entire";
}

function enabledBookingPackages(input: Pick<HostListingInput, "privacyType" | "bookingType" | "pricingMode" | "bookingPackages"> | Pick<HostListingDraftSaveInput, "privacyType" | "bookingType" | "pricingMode" | "bookingPackages">) {
  return isEntirePlaceListingInput(input) && input.bookingType !== "stay" && input.pricingMode === "packages" ? input.bookingPackages.filter((item) => item.enabled && item.status !== "inactive") : [];
}

function listingBookingTypeForStorage(input: Pick<HostListingInput, "privacyType" | "bookingType"> | Pick<HostListingDraftSaveInput, "privacyType" | "bookingType">) {
  return isEntirePlaceListingInput(input) ? input.bookingType : "stay";
}

function propertyScopedRooms(input: Pick<HostListingInput, "privacyType" | "rooms"> | Pick<HostListingDraftSaveInput, "privacyType" | "rooms">, propertyId: string) {
  if (!isEntirePlaceListingInput(input)) return [];

  return input.rooms
    .filter((room) => room.active && room.name.trim())
    .map((room) => ({
      id: `${propertyId}-${room.id}`,
      name: room.name,
      capacity: room.capacity,
      floor: room.floor || "Unassigned",
      description: room.description || undefined,
      photos: room.photos,
      amenities: room.amenities,
      active: room.active,
    }));
}

function roomPhotoUrls(input: Pick<HostListingInput, "rooms"> | Pick<HostListingDraftSaveInput, "rooms">) {
  return (input.rooms ?? []).flatMap((room) => room.photos);
}

function allUploadedListingPhotoUrlsBelongToScope(urls: string[], userId: string, uploadScopeId: string) {
  return urls.every((url) => isIntendedListingPhotoUrl(url, {
    userId,
    listingId: uploadScopeId,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  }));
}

function scopedPackageId(propertyId: string, id: string) {
  return id.startsWith(`${propertyId}-`) ? id : `${propertyId}-${id}`;
}

function scopedRoomId(propertyId: string, id: string) {
  return id.startsWith(`${propertyId}-`) ? id : `${propertyId}-${id}`;
}

function validSeasonalRates(rates: Array<{ id?: string; name: string; startDate: string; endDate: string; weekdayRate: number; weekendRate: number; holidayRate: number }> = []) {
  return rates
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(item.endDate) && item.endDate >= item.startDate && item.weekdayRate > 0)
    .map((item) => ({
      id: item.id || randomUUID(),
      name: item.name || "Seasonal rate",
      startDate: item.startDate,
      endDate: item.endDate,
      weekdayRate: item.weekdayRate,
      weekendRate: item.weekendRate > 0 ? item.weekendRate : undefined,
      holidayRate: item.holidayRate > 0 ? item.holidayRate : undefined,
    }));
}

function propertyScopedBookingPackages(input: Pick<HostListingInput, "privacyType" | "bookingType" | "pricingMode" | "bookingPackages"> | Pick<HostListingDraftSaveInput, "privacyType" | "bookingType" | "pricingMode" | "bookingPackages">, propertyId: string) {
  return enabledBookingPackages(input).map((item, index) => ({
    ...item,
    id: scopedPackageId(propertyId, item.id),
    displayOrder: item.displayOrder || index,
    status: item.status ?? "active",
    accessibleRoomIds: item.accessibleRoomIds.map((roomId) => scopedRoomId(propertyId, roomId)),
    blockedPackageIds: item.blockedPackageIds.map((packageId) => scopedPackageId(propertyId, packageId)),
    seasonalRates: validSeasonalRates(item.seasonalRates ?? []),
  }));
}

function minimumPackageWeekdayRate(input: Pick<HostListingInput, "privacyType" | "bookingType" | "pricingMode" | "bookingPackages" | "basePrice"> | Pick<HostListingDraftSaveInput, "privacyType" | "bookingType" | "pricingMode" | "bookingPackages" | "basePrice">) {
  const packages = enabledBookingPackages(input);
  return packages.length ? Math.min(...packages.map((item) => item.weekdayRate)) : input.basePrice;
}

function minimumPackageWeekendRate(input: Pick<HostListingInput, "privacyType" | "bookingType" | "pricingMode" | "bookingPackages" | "weekendPrice"> | Pick<HostListingDraftSaveInput, "privacyType" | "bookingType" | "pricingMode" | "bookingPackages" | "weekendPrice">) {
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
  const rooms = propertyScopedRooms(listing, identity.id);
  const bookingPackages = propertyScopedBookingPackages(listing, identity.id);
  const images = orderedImages(listing, identity.id).filter((image) => image.imageUrl);

  return {
    id: identity.id,
    hostId: userId,
    slug: identity.slug,
    title: draftText(listing.title, "Untitled draft"),
    description: draftText(listing.description, "Draft listing saved from the host setup wizard."),
    virtualTourUrl: listing.virtualTourUrl,
    listingVideoUrl: listing.listingVideoUrl,
    address: draftText([listing.street, listing.barangay].filter(Boolean).join(", "), "Address pending"),
    city: draftText(listing.city, "City pending"),
    country: draftText(listing.country, "Philippines"),
    barangay: listing.barangay || undefined,
    province: listing.province || undefined,
    zipCode: listing.zipCode || undefined,
    latitude: listing.latitude,
    longitude: listing.longitude,
    preciseLocation: listing.preciseLocation,
    bookingType: listingBookingTypeForStorage(listing),
    pricePerNight: minimumPackageWeekdayRate(listing),
    weekendPrice: minimumPackageWeekendRate(listing),
    holidayPrice: listing.holidayPrice,
    holidayDates: listing.holidayDates,
    seasonalRates: validSeasonalRates(listing.seasonalRates),
    cleaningFee: listing.cleaningFee,
    securityDeposit: listing.securityDeposit,
    currency: listing.currency || "PHP",
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    maxGuests: bookingPackages.length ? Math.max(...bookingPackages.map((item) => item.maxGuests)) : listing.guests,
    propertyType: draftText(listing.propertyType, "Property"),
    privacyType: listing.privacyType || "entire",
    status: "draft",
    rating: 0,
    amenities: toAmenityLabels(listing.amenityIds),
    rules: buildHouseRules(listing),
    createdAt,
    images: images.length ? images : [{ id: `${identity.id}-placeholder`, propertyId: identity.id, imageUrl: "pending-upload", tone: "from-rose-100 via-orange-50 to-stone-100" }],
    discounts: listing.discounts,
    rooms,
    bookingPackages,
  };
}

async function requireHost(forbiddenMessage = "Only hosts can create listings.") {
  await assertTrustedRequestOrigin();

  const user = await requireRole("host", {
    redirectTo: "/login?role=host",
    forbiddenMessage,
  });
  requireVerifiedEmail(user);
  return user;
}

export async function createListing(formData: FormData) {
  const user = await requireHost();
  await assertValidCsrfForm(formData);
  const parsed = listingFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    virtualTourUrl: formData.get("virtualTourUrl"),
    listingVideoUrl: formData.get("listingVideoUrl"),
    address: formData.get("address"),
    city: formData.get("city"),
    country: formData.get("country"),
    propertyType: formData.get("propertyType") || "House",
    pricePerNight: formData.get("pricePerNight"),
    weekendPrice: formData.get("weekendPrice") || "0",
    cleaningFee: formData.get("cleaningFee") || "0",
    securityDeposit: formData.get("securityDeposit") || "0",
    currency: formData.get("currency") || "PHP",
    bookingType: formData.get("bookingType") || "stay",
    holidayPrice: formData.get("holidayPrice") || "0",
    holidayDates: csvDateKeys(formData.get("holidayDates")),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    maxGuests: formData.get("maxGuests"),
    amenities: submittedAmenityValues(formData),
  });
  if (!parsed.success) throw new Error("Please complete all required listing fields.");

  const {
    title,
    description,
    virtualTourUrl,
    listingVideoUrl,
    address,
    city,
    country,
    propertyType,
    pricePerNight,
    cleaningFee,
    securityDeposit,
    currency,
    bookingType,
    holidayPrice,
    holidayDates,
    bedrooms,
    bathrooms,
    maxGuests,
    amenities,
  } = parsed.data;
  const weekendPrice = parsed.data.weekendPrice && parsed.data.weekendPrice > 0 ? parsed.data.weekendPrice : calculateDefaultWeekendPrice(pricePerNight);

  const id = randomUUID();
  const property: Property = {
    id,
    hostId: user.id,
    slug: `${slugify(title)}-${id.slice(0, 8)}`,
    title,
    description,
    virtualTourUrl,
    listingVideoUrl,
    address,
    city,
    country,
    bookingType,
    pricePerNight,
    weekendPrice,
    holidayPrice: holidayPrice ?? 0,
    holidayDates,
    cleaningFee,
    securityDeposit,
    currency,
    bedrooms,
    bathrooms,
    maxGuests,
    propertyType,
    privacyType: "entire",
    status: "pending",
    rating: 0,
    amenities,
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
  revalidatePublicListingSummaries();
  revalidatePath("/host/listings");
  redirect("/host/listings");
}

export async function updateListing(formData: FormData) {
  const user = await requireHost("Only hosts can edit listings.");
  await assertValidCsrfForm(formData);
  const parsed = listingFormSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description"),
    virtualTourUrl: formData.get("virtualTourUrl"),
    listingVideoUrl: formData.get("listingVideoUrl"),
    address: formData.get("address"),
    city: formData.get("city"),
    country: formData.get("country"),
    propertyType: formData.get("propertyType"),
    pricePerNight: formData.get("pricePerNight"),
    weekendPrice: formData.get("weekendPrice") || "0",
    cleaningFee: formData.get("cleaningFee") || "0",
    securityDeposit: formData.get("securityDeposit") || "0",
    currency: formData.get("currency") || "PHP",
    bookingType: formData.get("bookingType") || "stay",
    holidayPrice: formData.get("holidayPrice") || "0",
    holidayDates: csvDateKeys(formData.get("holidayDates")),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    maxGuests: formData.get("maxGuests"),
    amenities: submittedAmenityValues(formData),
  });
  if (!parsed.success || !parsed.data.id) throw new Error("Please complete all required listing fields.");

  const existing = await getPropertyById(parsed.data.id);
  if (!existing || existing.hostId !== user.id) throw new Error("Listing not found.");

  const weekendPrice = parsed.data.weekendPrice && parsed.data.weekendPrice > 0
    ? parsed.data.weekendPrice
    : calculateDefaultWeekendPrice(parsed.data.pricePerNight);
  const nextProperty = {
    ...existing,
    title: parsed.data.title,
    description: parsed.data.description,
    virtualTourUrl: parsed.data.virtualTourUrl,
    listingVideoUrl: parsed.data.listingVideoUrl,
    address: parsed.data.address,
    city: parsed.data.city,
    country: parsed.data.country,
    propertyType: parsed.data.propertyType,
    pricePerNight: parsed.data.pricePerNight,
    weekendPrice,
    cleaningFee: parsed.data.cleaningFee,
    securityDeposit: parsed.data.securityDeposit,
    currency: parsed.data.currency,
    bookingType: parsed.data.bookingType,
    holidayPrice: parsed.data.holidayPrice ?? 0,
    holidayDates: parsed.data.holidayDates,
    bedrooms: parsed.data.bedrooms,
    bathrooms: parsed.data.bathrooms,
    maxGuests: parsed.data.maxGuests,
    amenities: parsed.data.amenities,
    images: readSubmittedImages(formData, existing, user.id),
  } satisfies Property;

  if (usesPrismaPersistence()) {
    await updatePropertyDetailsInDatabase(nextProperty);
  } else {
    const storedProperties = await readStoredProperties();
    await writeStoredProperties(storedProperties.map((property) => property.id === nextProperty.id && property.hostId === user.id ? nextProperty : property));
  }

  revalidatePublicListingSummaries();
  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${nextProperty.id}`);
  revalidatePath(`/property/${nextProperty.slug}`);
  revalidatePath(`/rooms/${nextProperty.id}`);
  redirect(`/host/listings/${nextProperty.id}?updated=1`);
}

export async function deleteListing(formData: FormData) {
  try {
    const user = await requireHost("Only hosts can delete listings.");
    await assertValidCsrfForm(formData);

    const parsedId = z.string().trim().min(1).safeParse(formData.get("id"));
    if (!parsedId.success) return { status: "error" as const, error: "Listing not found." };

    const existing = await getPropertyById(parsedId.data);
    if (!existing || existing.hostId !== user.id) return { status: "error" as const, error: "Listing not found." };

    if (usesPrismaPersistence()) {
      await deletePropertyInDatabase(user.id, existing.id);
    } else {
      const bookings = await readStoredBookings();
      const hasActiveBooking = bookings.some((booking) =>
        booking.propertyId === existing.id && booking.status !== "cancelled" && booking.status !== "completed",
      );
      if (hasActiveBooking) return { status: "error" as const, error: protectedListingDeleteMessage };

      const storedProperties = await readStoredProperties();
      await writeStoredProperties(storedProperties.filter((property) => !(property.id === existing.id && property.hostId === user.id)));
    }

    revalidatePublicListingSummaries();
    revalidatePath("/host/listings");
    revalidatePath(`/host/listings/${existing.id}`);
    return { status: "deleted" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("booking")) {
      return { status: "error" as const, error: protectedListingDeleteMessage };
    }

    logger.warn("listing_delete_failed", { error });
    return { status: "error" as const, error: genericListingDeleteMessage };
  }
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
  const scopedRoomPhotoUrls = roomPhotoUrls(listing);
  const uploadedUrls = [...listing.photos.map((photo) => photo.url), ...scopedRoomPhotoUrls];
  if (!allUploadedListingPhotoUrlsBelongToScope(uploadedUrls, user.id, listing.uploadScopeId)) {
    logger.warn("wizard_draft_photo_scope_failed", {
      userId: user.id,
      uploadScopeId: listing.uploadScopeId,
      photoCount: listing.photos.length,
      roomPhotoCount: scopedRoomPhotoUrls.length,
    });
    throw new Error("Listing photos must be uploaded through StayPrimePH before saving.");
  }
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
  let user;
  try {
    user = await requireHost();
    await assertValidCsrfToken(csrfToken);
  } catch (error) {
    logger.warn("wizard_publish_auth_failed", { error });
    return { status: "error" as const, error: "Please refresh the page and sign in again before publishing." };
  }

  const parsed = hostListingSchema.safeParse(input);
  if (!parsed.success) {
    logger.warn("wizard_publish_validation_failed", { userId: user.id, issues: parsed.error.issues });
    return { status: "error" as const, error: "Please complete the required listing details before publishing." };
  }

  const listing = parsed.data;
  if (listing.locationConfirmedAddress !== formatListingAddress(listing)) {
    return { status: "error" as const, error: "Please confirm the map pin for the current listing address before publishing." };
  }

  const roomPhotos = roomPhotoUrls(listing);
  const uploadedUrls = [...listing.photos.map((photo) => photo.url), ...roomPhotos];
  if (!allUploadedListingPhotoUrlsBelongToScope(uploadedUrls, user.id, listing.uploadScopeId)) {
    logger.warn("wizard_publish_photo_scope_failed", {
      userId: user.id,
      uploadScopeId: listing.uploadScopeId,
      photoCount: listing.photos.length,
      roomPhotoCount: roomPhotos.length,
    });
    return { status: "error" as const, error: "Listing photos must be uploaded through StayPrimePH before publishing." };
  }

  const id = randomUUID();
  const rooms = propertyScopedRooms(listing, id);
  const bookingPackages = propertyScopedBookingPackages(listing, id);
  const property: Property = {
    id,
    hostId: user.id,
    slug: `${slugify(listing.title)}-${id.slice(0, 8)}`,
    title: listing.title,
    description: listing.description,
    virtualTourUrl: listing.virtualTourUrl,
    listingVideoUrl: listing.listingVideoUrl,
    address: `${listing.street}, ${listing.barangay}`,
    city: listing.city,
    country: listing.country,
    barangay: listing.barangay,
    province: listing.province,
    zipCode: listing.zipCode,
    latitude: listing.latitude,
    longitude: listing.longitude,
    preciseLocation: listing.preciseLocation,
    bookingType: listingBookingTypeForStorage(listing),
    pricePerNight: minimumPackageWeekdayRate(listing),
    weekendPrice: minimumPackageWeekendRate(listing),
    holidayPrice: listing.holidayPrice,
    holidayDates: listing.holidayDates,
    seasonalRates: validSeasonalRates(listing.seasonalRates),
    cleaningFee: listing.cleaningFee,
    securityDeposit: listing.securityDeposit,
    currency: listing.currency,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    maxGuests: bookingPackages.length ? Math.max(...bookingPackages.map((item) => item.maxGuests)) : listing.guests,
    propertyType: listing.propertyType,
    privacyType: listing.privacyType,
    status: "pending",
    rating: 0,
    amenities: toAmenityLabels(listing.amenityIds),
    rules: buildHouseRules(listing),
    createdAt: new Date().toISOString().slice(0, 10),
    images: orderedImages(listing, id),
    discounts: listing.discounts,
    rooms,
    bookingPackages,
  };
  const draftIdentity = draftPropertyIdentity(user.id, listing.uploadScopeId);

  try {
    if (usesPrismaPersistence()) {
      await createPropertyInDatabase(property);
      await deleteDraftPropertyInDatabase(user.id, draftIdentity.id);
    } else {
      const storedProperties = await readStoredProperties();
      await writeStoredProperties([property, ...storedProperties.filter((item) => item.id !== draftIdentity.id)]);
    }
  } catch (error) {
    logger.error("wizard_publish_persistence_failed", {
      userId: user.id,
      propertyId: property.id,
      uploadScopeId: listing.uploadScopeId,
      photoCount: listing.photos.length,
      bookingPackageCount: bookingPackages.length,
      error,
    });
    return { status: "error" as const, error: "We couldn't save your listing yet. Please try again in a moment." };
  }

  revalidatePublicListingSummaries();
  revalidatePath("/host/listings");
  return { status: "published" as const };
}
