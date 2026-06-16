"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { amenityGroups } from "@/lib/host-wizard-data";
import { createPropertyInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { hostListingSchema, type HostListingInput } from "@/lib/host-wizard-schema";
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

function orderedImages(input: HostListingInput, propertyId: string) {
  return [...input.photos]
    .sort((a, b) => Number(b.isCover) - Number(a.isCover))
    .map((photo) => ({ id: photo.id, propertyId, imageUrl: photo.url, tone: "from-rose-100 via-orange-50 to-stone-100" }));
}

function isAllowedListingPhotoUrl(value: string) {
  if (value.startsWith("/uploads/listings/")) return true;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.hostname === "res.cloudinary.com" && url.pathname.includes("/image/upload/")) return true;
    return url.hostname.endsWith(".public.blob.vercel-storage.com") && url.pathname.startsWith("/uploads/listings/");
  } catch {
    return false;
  }
}

async function requireHost() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=host");
  if (user.role !== "host") throw new Error("Only hosts can create listings.");
  return user;
}

export async function createListing(formData: FormData) {
  const user = await requireHost();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const propertyType = String(formData.get("propertyType") ?? "House").trim();
  const pricePerNight = numberFrom(formData, "pricePerNight");
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

export async function publishWizardListing(input: HostListingInput) {
  const user = await requireHost();
  const parsed = hostListingSchema.safeParse(input);
  if (!parsed.success) throw new Error("Please complete the required listing details before publishing.");

  const listing = parsed.data;
  if (!listing.photos.every((photo) => isAllowedListingPhotoUrl(photo.url))) {
    throw new Error("Listing photos must be uploaded through StayPrimePH before publishing.");
  }

  const id = randomUUID();
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
    pricePerNight: listing.basePrice,
    weekendPrice: listing.weekendPrice,
    cleaningFee: listing.cleaningFee,
    securityDeposit: listing.securityDeposit,
    currency: listing.currency,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    maxGuests: listing.guests,
    propertyType: listing.propertyType,
    status: "pending",
    rating: 0,
    amenities: toAmenityLabels(listing.amenityIds),
    rules: buildHouseRules(listing),
    createdAt: new Date().toISOString().slice(0, 10),
    images: orderedImages(listing, id),
    discounts: listing.discounts,
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
