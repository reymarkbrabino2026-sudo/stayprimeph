"use server";

import { revalidatePath } from "next/cache";
import { appendAdminLog } from "@/lib/admin-logs";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { getBookingById } from "@/lib/bookings";
import { resolveCancellationReview, type CancellationResolution } from "@/lib/cancellations";
import { assertValidCsrfForm } from "@/lib/csrf";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";

function revalidateCancellationReviewPaths(bookingId: string, propertyId?: string) {
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/disputes");
  revalidatePath("/admin/payments");
  revalidatePath("/guest/bookings");
  revalidatePath(`/guest/bookings/${bookingId}`);
  revalidatePath("/guest/notifications");
  revalidatePath("/host/bookings");
  revalidatePath("/host/dashboard");
  revalidatePath("/host/earnings");
  revalidatePath("/host/calendar");
  if (propertyId) {
    revalidatePath(`/rooms/${propertyId}`);
    revalidatePath(`/properties/${propertyId}`);
  }
}

async function resolveCancellation(formData: FormData, resolution: CancellationResolution) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const admin = await requireRole("admin", { forbiddenMessage: "Only admins can resolve cancellation reviews." });
  requireVerifiedEmail(admin);

  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const booking = bookingId ? await getBookingById(bookingId) : null;

  await resolveCancellationReview({ bookingId, resolution, adminId: admin.id });
  await appendAdminLog({
    adminId: admin.id,
    action: resolution === "refund" ? "dispute.refund_approved" : "dispute.closed_without_refund",
    entityType: "booking",
    entityId: bookingId,
  });
  revalidateCancellationReviewPaths(bookingId, booking?.propertyId);
}

export async function approveCancellationRefund(formData: FormData) {
  await resolveCancellation(formData, "refund");
}

export async function closeCancellationWithoutRefund(formData: FormData) {
  await resolveCancellation(formData, "no_refund");
}
