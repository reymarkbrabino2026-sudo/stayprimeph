import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { findPropertyByIdFromDatabase, listPropertiesByStatusFromDatabase, listPropertiesForHostFromDatabase, listPropertiesFromDatabase, listPublicListingSummariesFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
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
    amenities: property.amenities ?? [],
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

function propertyCreatedAtTime(property: Pick<Property, "createdAt">) {
  const time = new Date(property.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortPropertiesByCreatedAtDesc<T extends Pick<Property, "createdAt" | "id">>(properties: T[]) {
  return [...properties].sort((a, b) => (
    propertyCreatedAtTime(b) - propertyCreatedAtTime(a) ||
    b.createdAt.localeCompare(a.createdAt) ||
    b.id.localeCompare(a.id)
  ));
}

export async function getProperties() {
  if (usesPrismaPersistence()) return listPropertiesFromDatabase();
  return readStoredProperties();
}

export async function getPropertiesForHost(hostId: string) {
  if (usesPrismaPersistence()) return sortPropertiesByCreatedAtDesc(await listPropertiesForHostFromDatabase(hostId));
  const properties = await readStoredProperties();
  return sortPropertiesByCreatedAtDesc(properties.filter((property) => property.hostId === hostId));
}

export async function getPropertiesByStatus(status: Property["status"]) {
  if (usesPrismaPersistence()) return listPropertiesByStatusFromDatabase(status);
  const properties = await readStoredProperties();
  return properties.filter((property) => property.status === status);
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

const getCachedPropertyById = unstable_cache(
  async (id: string) => {
    if (usesPrismaPersistence()) return findPropertyByIdFromDatabase(id);
    const properties = await getProperties();
    return properties.find((property) => property.id === id) ?? null;
  },
  ["property-by-id"],
  {
    // The property entity changes rarely and excludes live booking availability,
    // so cache it cross-request. revalidatePublicListingSummaries() shares this
    // tag, so any listing edit invalidates these entries immediately.
    revalidate: publicListingSummariesRevalidateSeconds,
    tags: [publicListingSummariesCacheTag],
  },
);

export async function getPropertyById(id: string) {
  return getCachedPropertyById(id);
}
