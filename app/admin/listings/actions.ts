"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { updatePropertyStatusInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { sendListingReviewEmail } from "@/lib/email";
import { getPropertyById } from "@/lib/properties";
import { getUserById } from "@/lib/users";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import type { ListingStatus } from "@/lib/types";

async function updateListingStatus(id: string, status: ListingStatus) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    logger.warn("listing_status_forbidden", { listingId: id, status });
    throw new Error("Only admins can review listings.");
  }
  if (usesPrismaPersistence()) {
    await updatePropertyStatusInDatabase(id, status);
  } else {
    const storedProperties = await readStoredProperties();
    const next = storedProperties.map((property) => property.id === id ? { ...property, status } : property);
    await writeStoredProperties(next);
  }
  const property = await getPropertyById(id);
  const host = property ? await getUserById(property.hostId) : null;
  if (property && host) {
    await sendListingReviewEmail({ to: host.email, title: property.title, status });
  }
  logger.info("listing_status_updated", { listingId: id, status, adminId: user.id });
  revalidatePath("/");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/listings");
  revalidatePath("/host/listings");
  revalidatePath("/search");
}

export async function approveListing(formData: FormData) {
  await updateListingStatus(String(formData.get("id")), "approved");
}

export async function rejectListing(formData: FormData) {
  await updateListingStatus(String(formData.get("id")), "rejected");
}
