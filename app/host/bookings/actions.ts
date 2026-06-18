"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { getBookingById } from "@/lib/bookings";
import { assertValidCsrfForm } from "@/lib/csrf";
import { env } from "@/lib/env";
import { sendBookingConfirmedEmail } from "@/lib/email";
import { arePaidBookingsEnabled } from "@/lib/payments";
import { getPropertyById } from "@/lib/properties";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { updateBookingStatusInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { getUserById } from "@/lib/users";
import type { Booking, BookingStatus, Property, User } from "@/lib/types";

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

async function sendBookingConfirmationPair(booking: Booking, host: User) {
  const [property, guest] = await Promise.all([getPropertyById(booking.propertyId), getUserById(booking.guestId)]);
  if (!property || !guest) return;

  await sendBookingConfirmedEmail({
    ...confirmationEmailDetails({
      booking: { ...booking, status: "confirmed" },
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
      booking: { ...booking, status: "confirmed" },
      property,
      guest,
      host,
      to: host.email,
      actionPath: "/host/bookings",
    }),
    recipientRole: "host",
  });
}

async function updateHostBookingStatus(formData: FormData, status: BookingStatus) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const user = await requireRole("host", { forbiddenMessage: "Only hosts can manage booking requests." });
  requireVerifiedEmail(user);

  const id = String(formData.get("id") ?? "");
  const booking = await getBookingById(id);
  if (!booking || booking.hostId !== user.id) throw new Error("Booking request not found.");
  if (status === "confirmed" && arePaidBookingsEnabled() && booking.paymentStatus !== "paid") {
    throw new Error("Booking payment must be verified by the platform before confirmation.");
  }

  if (usesPrismaPersistence()) {
    await updateBookingStatusInDatabase(id, status);
  } else {
    const storedBookings = await readStoredBookings();
    const foundInStore = storedBookings.some((item) => item.id === id);
    const nextBookings = foundInStore
      ? storedBookings.map((item) => item.id === id ? { ...item, status } : item)
      : [{ ...booking, status }, ...storedBookings];
    await writeStoredBookings(nextBookings);
  }

  revalidatePath("/host/dashboard");
  revalidatePath("/host/bookings");
  revalidatePath(`/guest/bookings/${id}`);
  revalidatePath("/guest/bookings");
  revalidatePath("/admin/bookings");

  return { booking: { ...booking, status }, user };
}

export async function acceptBooking(formData: FormData) {
  const { booking, user } = await updateHostBookingStatus(formData, "confirmed");
  await sendBookingConfirmationPair(booking, user);
}

export async function rejectBooking(formData: FormData) {
  await updateHostBookingStatus(formData, "cancelled");
}

export async function confirmPaymentAndApproveBooking(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);
  void formData;
  throw new Error("Only platform admins can verify submitted payments.");
}

export async function rejectSubmittedPayment(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);
  void formData;
  throw new Error("Only platform admins can reject submitted payments.");
}
