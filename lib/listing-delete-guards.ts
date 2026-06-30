import type { BookingStatus, PaymentStatus } from "@/lib/types";

type ListingDeleteBooking = {
  status: BookingStatus | string;
  paymentStatus: PaymentStatus | string;
  checkOut: Date | string;
};

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function bookingBlocksListingDelete(booking: ListingDeleteBooking, now = new Date()) {
  if (booking.paymentStatus === "submitted") return true;
  if (booking.status !== "pending" && booking.status !== "confirmed") return false;

  const checkOut = new Date(booking.checkOut);
  if (Number.isNaN(checkOut.getTime())) return true;

  return checkOut >= startOfToday(now);
}
