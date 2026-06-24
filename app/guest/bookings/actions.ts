"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { cancelBookingByGuest, getBookingById } from "@/lib/bookings";
import { evaluateCancellationPolicy } from "@/lib/cancellation-policy";
import { assertValidCsrfForm } from "@/lib/csrf";
import { storePaymentReceiptImage } from "@/lib/payment-receipt-storage";
import { getPaymentByBookingId, readManualPaymentInput, submitManualPayment } from "@/lib/payments";
import { getPropertyById } from "@/lib/properties";
import { canReviewBooking, createStayReview, getReviewForBooking } from "@/lib/reviews";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";

export type ManualPaymentActionState = {
  error?: string;
};

export type ReviewActionState = {
  error?: string;
};

export type CancellationActionState = {
  error?: string;
};

function isBeforeCheckIn(checkIn: string) {
  const checkInDate = new Date(`${checkIn}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return checkInDate.getTime() > today.getTime();
}

function actionError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function requireGuestBookingUser() {
  return requireRole("guest", {
    message: "Please sign in as the guest for this booking.",
    forbiddenMessage: "Please sign in as the guest for this booking.",
  });
}

export async function cancelGuestBooking(
  _previousState: CancellationActionState,
  formData: FormData,
): Promise<CancellationActionState> {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  let user;
  try {
    user = await requireGuestBookingUser();
  } catch (error) {
    return { error: actionError(error, "Please sign in as the guest for this booking.") };
  }

  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  let propertyId = "";

  try {
    if (!bookingId) throw new Error("Booking is required.");
    if (reason.length > 500) throw new Error("Please keep the cancellation reason under 500 characters.");

    const booking = await getBookingById(bookingId);
    if (!booking || booking.guestId !== user.id) throw new Error("Booking not found.");
    propertyId = booking.propertyId;
    if (booking.status === "cancelled") throw new Error("This booking is already cancelled.");
    if (booking.status === "completed") throw new Error("Completed stays cannot be cancelled.");
    if (!isBeforeCheckIn(booking.checkIn)) throw new Error("Bookings can only be cancelled before check-in.");

    const payment = await getPaymentByBookingId(booking.id);
    const policy = evaluateCancellationPolicy({ booking, payment });
    await cancelBookingByGuest(booking, reason || undefined, {
      status: policy.cancellationStatus,
      policySummary: policy.adminSummary,
      policyOutcome: policy.outcome,
      refundPercent: policy.refundPercent,
      refundAmount: policy.refundAmount,
      paidAmount: policy.paidAmount,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Booking could not be cancelled." };
  }

  revalidatePath(`/guest/bookings/${bookingId}`);
  revalidatePath("/guest/bookings");
  revalidatePath("/guest/dashboard");
  revalidatePath("/host/bookings");
  revalidatePath("/host/calendar");
  revalidatePath("/host/dashboard");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/disputes");
  if (propertyId) {
    revalidatePath(`/rooms/${propertyId}`);
    revalidatePath(`/properties/${propertyId}`);
  }
  redirect(`/guest/bookings/${bookingId}?cancel=success`);
}

export async function submitManualPaymentDetails(
  _previousState: ManualPaymentActionState,
  formData: FormData,
): Promise<ManualPaymentActionState> {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  let user;
  try {
    user = await requireGuestBookingUser();
  } catch (error) {
    return { error: actionError(error, "Please sign in as the guest for this booking.") };
  }
  try {
    requireVerifiedEmail(user);
  } catch (error) {
    return { error: actionError(error, "Verify your email address before submitting payment.") };
  }

  let bookingId = "";

  try {
    const paymentInput = readManualPaymentInput(formData);
    bookingId = paymentInput.bookingId;
    const booking = await getBookingById(bookingId);
    if (!booking) throw new Error("Booking request not found.");
    if (booking.guestId !== user.id) throw new Error("Booking request not found.");
    const receiptImageUrl = await storePaymentReceiptImage({
      file: formData.get("receiptImage"),
      userId: user.id,
      bookingId: booking.id,
    });

    await submitManualPayment({
      guestId: user.id,
      booking,
      paymentInput: { ...paymentInput, receiptImageUrl },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Payment details could not be submitted." };
  }

  revalidatePath(`/guest/bookings/${bookingId}`);
  revalidatePath("/guest/bookings");
  revalidatePath("/guest/notifications");
  revalidatePath("/host/bookings");
  revalidatePath("/host/dashboard");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/payments");
  redirect(`/guest/bookings/${bookingId}?payment=manual-submitted`);
}

export async function submitStayReview(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  let user;
  try {
    user = await requireGuestBookingUser();
  } catch (error) {
    return { error: actionError(error, "Please sign in as the guest for this booking.") };
  }

  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim();
  let propertyId = "";

  try {
    const booking = await getBookingById(bookingId);
    if (!booking || booking.guestId !== user.id) throw new Error("Booking not found.");
    propertyId = booking.propertyId;
    if (!canReviewBooking(booking)) {
      throw new Error("You can leave a review after you complete a paid stay.");
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Choose a rating from 1 to 5 stars.");
    }
    if (comment.length < 20) {
      throw new Error("Write at least 20 characters about your real stay experience.");
    }

    const property = await getPropertyById(booking.propertyId);
    if (!property) throw new Error("Listing not found.");

    const existingReview = await getReviewForBooking(booking);
    if (existingReview) throw new Error("You already reviewed this stay.");

    await createStayReview({
      booking,
      review: {
        id: randomUUID(),
        bookingId: booking.id,
        propertyId: booking.propertyId,
        guestId: user.id,
        rating,
        comment,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Review could not be submitted." };
  }

  revalidatePath(`/guest/bookings/${bookingId}`);
  revalidatePath("/guest/bookings");
  revalidatePath("/guest/reviews");
  revalidatePath("/host/reviews");
  revalidatePath("/host/dashboard");
  revalidatePath("/admin/reviews");
  revalidatePath(`/rooms/${propertyId}`);
  redirect(`/guest/bookings/${bookingId}?review=posted`);
}
