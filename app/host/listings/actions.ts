"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { assertValidCsrfForm, assertValidCsrfToken } from "@/lib/csrf";
import { env } from "@/lib/env";
import { amenityGroups } from "@/lib/host-wizard-data";
import { createPropertyInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { hostListingSchema, type HostListingInput } from "@/lib/host-wizard-schema";
import { calculateDefaultWeekendPrice } from "@/lib/pricing";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { isIntendedListingPhotoUrl } from "@/lib/upload-paths";
import type { Property } from "@/lib/types";

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

function buildHouseRules(input: HostListingInput) {
  const rules = ["No smoking", "No parties or events", "Quiet hours after 10 PM"];
  if (input.safetyDisclosures.exteriorCamera) rules.push("Exterior security camera present");
  if (input.safetyDisclosures.noiseMonitor) rules.push("Noise decibel monitor present");
  if (input.safetyDisclosures.weapons) rules.push("Weapon(s) on the property");
  if (input.bookingMode === "instant") rules.push("Instant book enabled");
  return rules;
}

function formatListingAddress(input: Pick<HostListingInput, "street" | "barangay" | "city" | "province" | "country" | "zipCode">) {
  return [input.street, input.barangay, input.city, input.province, input.country, input.zipCode]
    .filter(Boolean)
    .join(", ");
}

function orderedImages(input: HostListingInput, propertyId: string) {
  return [...input.photos]
    .sort((a, b) => Number(b.isCover) - Number(a.isCover))
    .map((photo) => ({ id: photo.id, propertyId, imageUrl: photo.url, tone: "from-rose-100 via-orange-50 to-stone-100" }));
}

function enabledBookingPackages(input: HostListingInput) {
  return input.pricingMode === "packages" ? input.bookingPackages.filter((item) => item.enabled) : [];
}

function propertyScopedBookingPackages(input: HostListingInput, propertyId: string) {
  return enabledBookingPackages(input).map((item) => ({ ...item, id: `${propertyId}-${item.id}` }));
}

function minimumPackageWeekdayRate(input: HostListingInput) {
  const packages = enabledBookingPackages(input);
  return packages.length ? Math.min(...packages.map((item) => item.weekdayRate)) : input.basePrice;
}

function minimumPackageWeekendRate(input: HostListingInput) {
  const packages = enabledBookingPackages(input);
  if (!packages.length) return input.weekendPrice;
  return Math.min(...packages.map((item) => item.weekendRate > 0 ? item.weekendRate : item.weekdayRate));
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
