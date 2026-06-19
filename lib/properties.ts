import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { findPropertyByIdFromDatabase, listPropertiesFromDatabase, listPublicListingSummariesFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredProperties } from "@/lib/property-store";
import type { Property, PublicListingSummary } from "@/lib/types";

export const publicListingSummariesCacheTag = "public-listing-summaries";
export const publicListingSummariesRevalidateSeconds = 60;

const getCachedApprovedPropertiesFromDatabase = unstable_cache(
  async () => {
    const properties = await listPropertiesFromDatabase();
    return properties.filter((property) => property.status === "approved");
  },
  ["approved-properties"],
  { revalidate: publicListingSummariesRevalidateSeconds },
);

function toPublicListingSummary(property: Property): PublicListingSummary {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    address: property.address,
    city: property.city,
    country: property.country,
    pricePerNight: property.pricePerNight,
    bedrooms: property.bedrooms,
    maxGuests: property.maxGuests,
    propertyType: property.propertyType,
    rating: property.rating,
    createdAt: property.createdAt,
    images: property.images.slice(0, 1),
    latitude: property.latitude,
    longitude: property.longitude,
    barangay: property.barangay,
    province: property.province,
    zipCode: property.zipCode,
    preciseLocation: property.preciseLocation,
  };
}

export async function getProperties() {
  if (usesPrismaPersistence()) return listPropertiesFromDatabase();
  return readStoredProperties();
}

export async function getApprovedProperties() {
  if (usesPrismaPersistence()) return getCachedApprovedPropertiesFromDatabase();
  const properties = await readStoredProperties();
  return properties.filter((property) => property.status === "approved");
}

const getCachedPublicListingSummaries = unstable_cache(
  async () => {
    if (usesPrismaPersistence()) return listPublicListingSummariesFromDatabase();

    const properties = await readStoredProperties();
    return properties
      .filter((property) => property.status === "approved")
      .map(toPublicListingSummary)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  [publicListingSummariesCacheTag],
  {
    revalidate: publicListingSummariesRevalidateSeconds,
    tags: [publicListingSummariesCacheTag],
  },
);

export async function getPublicListingSummaries() {
  return getCachedPublicListingSummaries();
}

export function revalidatePublicListingSummaries() {
  revalidateTag(publicListingSummariesCacheTag, "max");
  revalidatePath("/", "page");
  revalidatePath("/search", "page");
}

const getCachedPropertyById = cache(async (id: string) => {
  if (usesPrismaPersistence()) return findPropertyByIdFromDatabase(id);
  const properties = await getProperties();
  return properties.find((property) => property.id === id) ?? null;
});

export async function getPropertyById(id: string) {
  return getCachedPropertyById(id);
}
