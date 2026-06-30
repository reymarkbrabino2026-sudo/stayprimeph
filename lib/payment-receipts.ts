import "server-only";

import { env } from "@/lib/env";
import { sendPaymentReceiptEmail } from "@/lib/email";
import { getPropertyById } from "@/lib/properties";
import { getUserById } from "@/lib/users";
import type { Booking, Payment } from "@/lib/types";

type GuestPaymentReceiptInput = {
  booking: Booking;
  payment?: Payment | null;
  amountPaid?: number;
  paymentMethod?: string;
  transactionId?: string;
  paidAt?: string;
  receiptSuffix?: string;
  receiptNote?: string;
};

function bookingReceiptNumber(bookingId: string, suffix?: string) {
  const code = bookingId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const base = code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
  return suffix ? `${base}-${suffix}` : base;
}

export async function sendGuestPaymentReceipt({
  booking,
  payment,
  amountPaid,
  paymentMethod,
  transactionId,
  paidAt,
  receiptSuffix,
  receiptNote,
}: GuestPaymentReceiptInput) {
  const paidAmount = amountPaid ?? payment?.amount ?? booking.totalPrice;
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) return;

  const [property, guest, host] = await Promise.all([
    getPropertyById(booking.propertyId),
    getUserById(booking.guestId),
    getUserById(booking.hostId),
  ]);
  if (!property || !guest) return;

  await sendPaymentReceiptEmail({
    to: guest.email,
    propertyTitle: property.title,
    propertyImageUrl: property.images[0]?.imageUrl,
    propertyLocation: [property.city, property.country].filter(Boolean).join(", "),
    propertyAddress: property.address,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    bookingId: booking.id,
    bookingPackageName: booking.bookingPackageName,
    actionUrl: `${env.NEXT_PUBLIC_APP_URL}/guest/bookings/${booking.id}`,
    hostName: host?.name,
    guestName: guest.name,
    amountPaid: paidAmount,
    paymentMethod: paymentMethod ?? payment?.paymentMethod ?? "other",
    paymentStatus: payment?.paymentStatus ?? booking.paymentStatus,
    transactionId: transactionId ?? payment?.transactionId ?? payment?.id ?? booking.id,
    paymentId: payment?.id,
    paidAt: paidAt ?? payment?.confirmedAt ?? payment?.updatedAt ?? payment?.submittedAt ?? new Date().toISOString(),
    receiptNumber: bookingReceiptNumber(booking.id, receiptSuffix),
    invoiceNumber: `SPH-${bookingReceiptNumber(booking.id)}`,
    receiptNote,
  });
}
