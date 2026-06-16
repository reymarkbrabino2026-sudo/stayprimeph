"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { getBookingById } from "@/lib/bookings";
import { env } from "@/lib/env";
import { sendBookingConfirmedEmail } from "@/lib/email";
import { confirmManualPayment, rejectManualPayment } from "@/lib/payments";
import { getPropertyById } from "@/lib/properties";
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
  const user = await getCurrentUser();
  if (!user || user.role !== "host") throw new Error("Only hosts can manage booking requests.");

  const id = String(formData.get("id") ?? "");
  const booking = await getBookingById(id);
  if (!booking || booking.hostId !== user.id) throw new Error("Booking request not found.");

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

async function getHostBookingFromForm(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "host") throw new Error("Only hosts can manage booking payments.");

  const id = String(formData.get("id") ?? "");
  const booking = await getBookingById(id);
  if (!booking || booking.hostId !== user.id) throw new Error("Booking request not found.");

  return { booking, user };
}

export async function confirmPaymentAndApproveBooking(formData: FormData) {
  const { booking, user } = await getHostBookingFromForm(formData);
  await confirmManualPayment({ booking, hostId: user.id });
  await sendBookingConfirmationPair({ ...booking, status: "confirmed", paymentStatus: "paid" }, user);

  revalidatePath("/host/dashboard");
  revalidatePath("/host/bookings");
  revalidatePath("/host/earnings");
  revalidatePath(`/guest/bookings/${booking.id}`);
  revalidatePath("/guest/bookings");
  revalidatePath("/guest/notifications");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/payments");
}

export async function rejectSubmittedPayment(formData: FormData) {
  const { booking, user } = await getHostBookingFromForm(formData);
  const rejectionReason = String(formData.get("rejectionReason") ?? "");
  await rejectManualPayment({ booking, hostId: user.id, rejectionReason });

  revalidatePath("/host/dashboard");
  revalidatePath("/host/bookings");
  revalidatePath(`/guest/bookings/${booking.id}`);
  revalidatePath("/guest/bookings");
  revalidatePath("/guest/notifications");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/payments");
}
