"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { getBookingById } from "@/lib/bookings";
import { assertValidCsrfForm } from "@/lib/csrf";
import { env } from "@/lib/env";
import { sendBookingConfirmedEmail } from "@/lib/email";
import { rejectSubmittedPaymentByAdmin, verifySubmittedPaymentByAdmin } from "@/lib/payments";
import { recordHostPayout } from "@/lib/payouts";
import { getPropertyById } from "@/lib/properties";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { getUserById } from "@/lib/users";
import type { Booking, Property, User } from "@/lib/types";

function confirmationEmailDetails({
  booking,
  property,
  guest,
  host,
  to,
  actionPath,
}: {
  booking: Booking;
  property: Property;
  guest: User;
  host: User;
  to: string;
  actionPath: string;
}) {
  return {
    to,
    propertyTitle: property.title,
    propertyImageUrl: property.images[0]?.imageUrl,
    propertyLocation: [property.city, property.country].filter(Boolean).join(", "),
    propertyAddress: property.address,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    bookingId: booking.id,
    actionUrl: `${env.NEXT_PUBLIC_APP_URL}${actionPath}`,
    hostName: host.name,
    guestName: guest.name,
  };
}

async function sendBookingConfirmationPair(booking: Booking) {
  const [property, guest, host] = await Promise.all([
    getPropertyById(booking.propertyId),
    getUserById(booking.guestId),
    getUserById(booking.hostId),
  ]);
  if (!property || !guest || !host) return;

  await sendBookingConfirmedEmail({
    ...confirmationEmailDetails({
      booking: { ...booking, status: "confirmed", paymentStatus: "paid" },
      property,
      guest,
      host,
      to: guest.email,
      actionPath: `/guest/bookings/${booking.id}`,
    }),
    recipientRole: "guest",
  });
  await sendBookingConfirmedEmail({
    ...confirmationEmailDetails({
      booking: { ...booking, status: "confirmed", paymentStatus: "paid" },
      property,
      guest,
      host,
      to: host.email,
      actionPath: "/host/bookings",
    }),
    recipientRole: "host",
  });
}

function revalidatePaymentReviewPaths(bookingId: string) {
  revalidatePath("/admin/payments");
  revalidatePath("/admin/bookings");
  revalidatePath("/host/bookings");
  revalidatePath("/host/dashboard");
  revalidatePath("/host/earnings");
  revalidatePath(`/guest/bookings/${bookingId}`);
  revalidatePath("/guest/bookings");
  revalidatePath("/guest/notifications");
}

export async function verifySubmittedPayment(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const admin = await requireRole("admin", { forbiddenMessage: "Only admins can verify submitted payments." });
  requireVerifiedEmail(admin);

  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");

  await verifySubmittedPaymentByAdmin({ booking, adminId: admin.id });
  await sendBookingConfirmationPair(booking);
  revalidatePaymentReviewPaths(booking.id);
}

export async function recordPayout(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const admin = await requireRole("admin", { forbiddenMessage: "Only admins can record payouts." });
  requireVerifiedEmail(admin);

  const hostId = String(formData.get("hostId") ?? "").trim();
  const amount = Number(formData.get("amount"));
  if (!hostId) throw new Error("Host is required.");

  await recordHostPayout(hostId, amount);
  revalidatePath("/admin/payments");
}

export async function rejectSubmittedPayment(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const admin = await requireRole("admin", { forbiddenMessage: "Only admins can verify submitted payments." });
  requireVerifiedEmail(admin);

  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");

  await rejectSubmittedPaymentByAdmin({ booking, adminId: admin.id, rejectionReason });
  revalidatePaymentReviewPaths(booking.id);
}
