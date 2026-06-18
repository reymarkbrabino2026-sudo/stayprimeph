"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { assertValidCsrfForm } from "@/lib/csrf";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { updatePropertyStatusInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { sendListingReviewEmail } from "@/lib/email";
import { getPropertyById } from "@/lib/properties";
import { getUserById } from "@/lib/users";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { isHostScopedListingPhotoUrl } from "@/lib/upload-paths";
import type { ListingStatus } from "@/lib/types";

async function updateListingStatus(formData: FormData, status: ListingStatus) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const id = String(formData.get("id"));
  let user;
  try {
    user = await requireRole("admin", { forbiddenMessage: "Only admins can review listings." });
  } catch (error) {
    logger.warn("listing_status_forbidden", { listingId: id, status });
    throw error;
  }

  const property = await getPropertyById(id);
  if (status === "approved") {
    const intendedImages = property?.images.length
      ? property.images.every((image) => isHostScopedListingPhotoUrl(image.imageUrl, {
        userId: property.hostId,
        cloudName: env.CLOUDINARY_CLOUD_NAME,
      }))
      : false;

    if (!intendedImages) {
      logger.warn("listing_status_invalid_images", { listingId: id, adminId: user.id });
      throw new Error("Listing images must be uploaded through StayPrimePH before approval.");
    }
  }

  if (usesPrismaPersistence()) {
    await updatePropertyStatusInDatabase(id, status);
  } else {
    const storedProperties = await readStoredProperties();
    const next = storedProperties.map((property) => property.id === id ? { ...property, status } : property);
    await writeStoredProperties(next);
  }
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
  await updateListingStatus(formData, "approved");
}

export async function rejectListing(formData: FormData) {
  await updateListingStatus(formData, "rejected");
}
