"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBookingById } from "@/lib/bookings";
import { readManualPaymentInput, submitManualPayment } from "@/lib/payments";
import { getPropertyById } from "@/lib/properties";
import { canReviewBooking, createStayReview, getReviewForBooking } from "@/lib/reviews";

export type ManualPaymentActionState = {
  error?: string;
};

export type ReviewActionState = {
  error?: string;
};

export async function submitManualPaymentDetails(
  _previousState: ManualPaymentActionState,
  formData: FormData,
): Promise<ManualPaymentActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "guest") return { error: "Please sign in as the guest for this booking." };

  let bookingId = "";

  try {
    const paymentInput = readManualPaymentInput(formData);
    bookingId = paymentInput.bookingId;
    const booking = await getBookingById(bookingId);
    if (!booking) throw new Error("Booking request not found.");

    await submitManualPayment({
      guestId: user.id,
      booking,
      paymentInput,
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
  const user = await getCurrentUser();
  if (!user || user.role !== "guest") return { error: "Please sign in as the guest for this booking." };

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
