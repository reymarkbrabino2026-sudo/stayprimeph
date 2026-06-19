import { getAdminReviews } from "@/lib/admin-data";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { createReviewInDatabase, listReviewsForPropertyFromDatabase, updateBookingStatusInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredReviews, writeStoredReviews } from "@/lib/review-store";
import type { Booking, Review } from "@/lib/types";

export async function getReviews(): Promise<Review[]> {
  return getAdminReviews().catch(() => []);
}

export async function getReviewsForProperty(propertyId: string): Promise<Review[]> {
  if (usesPrismaPersistence()) return listReviewsForPropertyFromDatabase(propertyId);
  const reviews = await readStoredReviews();
  return reviews.filter((review) => review.propertyId === propertyId);
}

export function hasStayEnded(booking: Pick<Booking, "checkOut">, now = new Date()) {
  const checkoutDate = new Date(`${booking.checkOut}T00:00:00`);
  return Number.isFinite(checkoutDate.getTime()) && now >= checkoutDate;
}

export function canReviewBooking(booking: Booking, now = new Date()) {
  if (booking.paymentStatus !== "paid" || booking.status === "cancelled") return false;
  return booking.status === "completed" || (booking.status === "confirmed" && hasStayEnded(booking, now));
}

export async function getReviewForBooking(booking: Booking) {
  const reviews = await getReviews();
  return reviews.find((review) =>
    review.bookingId === booking.id ||
    (review.propertyId === booking.propertyId && review.guestId === booking.guestId)
  ) ?? null;
}

function averageRating(reviews: Review[]) {
  if (!reviews.length) return 0;
  return Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2));
}

export async function createStayReview({ booking, review }: { booking: Booking; review: Review }) {
  if (usesPrismaPersistence()) {
    await createReviewInDatabase(review);
    if (booking.status !== "completed") {
      await updateBookingStatusInDatabase(booking.id, "completed");
    }
    return;
  }

  const [reviews, bookings, properties] = await Promise.all([
    readStoredReviews(),
    readStoredBookings(),
    readStoredProperties(),
  ]);
  const nextReviews = [review, ...reviews];
  const propertyReviews = nextReviews.filter((item) => item.propertyId === review.propertyId);

  await Promise.all([
    writeStoredReviews(nextReviews),
    writeStoredBookings(bookings.map((item) => item.id === booking.id ? { ...item, status: "completed" } : item)),
    writeStoredProperties(properties.map((property) =>
      property.id === review.propertyId ? { ...property, rating: averageRating(propertyReviews) } : property
    )),
  ]);
}
