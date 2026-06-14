"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getBookings, hasDateConflict } from "@/lib/bookings";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { createBookingInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { sendBookingCreatedEmail } from "@/lib/email";
import { getUserById } from "@/lib/users";
import { getBestDiscount } from "@/lib/pricing";
import { getPropertyById } from "@/lib/properties";
import type { Booking } from "@/lib/types";

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
}

function isIsoDate(value: string) {
  const raw = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;

  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === raw;
}

function dateTime(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function checkoutPath(propertyId: string, checkIn: string, checkOut: string, guests: number, error?: string) {
  const params = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
  if (error) params.set("error", error);
  return `/bookings/checkout/${propertyId}?${params.toString()}`;
}

const bookingFormSchema = z.object({
  propertyId: z.string().trim().min(1).max(120),
  checkIn: z.string().trim().refine(isIsoDate, "Use a valid check-in date."),
  checkOut: z.string().trim().refine(isIsoDate, "Use a valid check-out date."),
  guests: z.coerce.number().int().min(1).max(50),
});

export async function createBooking(formData: FormData) {
  const parsed = bookingFormSchema.safeParse({
    propertyId: formData.get("propertyId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    guests: formData.get("guests"),
  });
  if (!parsed.success) throw new Error("Please complete your booking details.");

  const { propertyId, checkIn, checkOut, guests } = parsed.data;
  const checkInTime = dateTime(checkIn);
  const checkOutTime = dateTime(checkOut);
  const property = await getPropertyById(propertyId);
  const bookings = await getBookings();
  const user = await getCurrentUser();

  if (!user) redirect(`/login?role=guest&next=${encodeURIComponent(checkoutPath(propertyId, checkIn, checkOut, guests))}`);
  if (user.role !== "guest") redirect(checkoutPath(propertyId, checkIn, checkOut, guests, "guest-only"));
  if (!property) throw new Error("Please complete your booking details.");
  if (property.status !== "approved") throw new Error("This listing is not available for booking.");
  if (!Number.isFinite(property.pricePerNight) || property.pricePerNight <= 0) throw new Error("This listing is missing valid pricing.");
  if (!Number.isInteger(property.maxGuests) || guests > property.maxGuests) throw new Error("Guest count exceeds this listing's capacity.");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (checkInTime < today.getTime()) throw new Error("Check-in must be today or later.");
  if (checkOutTime <= checkInTime) throw new Error("Check-out must be after check-in.");
  if (hasDateConflict(bookings, propertyId, checkIn, checkOut)) throw new Error("Those dates are no longer available.");

  const nights = nightsBetween(checkIn, checkOut);
  if (nights > 90) throw new Error("Stays longer than 90 nights need host approval.");
  const subtotal = property.pricePerNight * nights;
  const discount = getBestDiscount({ property, bookings, checkIn, nights, subtotal });
  const discountedSubtotal = subtotal - (discount?.amount ?? 0);
  const serviceFee = Math.round(discountedSubtotal * 0.12);
  const totalPrice = discountedSubtotal + serviceFee;
  if (!Number.isSafeInteger(totalPrice) || totalPrice <= 0) throw new Error("This booking total could not be calculated.");
  const booking: Booking = {
    id: randomUUID(),
    propertyId,
    guestId: user.id,
    hostId: property.hostId,
    checkIn,
    checkOut,
    guests,
    totalPrice,
    status: property.rules.includes("Instant book enabled") ? "confirmed" : "pending",
    paymentStatus: "pending",
    createdAt: new Date().toISOString().slice(0, 10),
  };

  if (usesPrismaPersistence()) {
    await createBookingInDatabase(booking);
  } else {
    const latestBookings = await readStoredBookings();
    if (hasDateConflict(latestBookings, propertyId, checkIn, checkOut)) throw new Error("Those dates are no longer available.");
    await writeStoredBookings([booking, ...latestBookings]);
  }
  const guest = await getUserById(user.id);
  if (guest) {
    await sendBookingCreatedEmail({
      to: guest.email,
      propertyTitle: property.title,
      checkIn,
      checkOut,
    });
  }
  const host = await getUserById(property.hostId);
  if (host) {
    await sendBookingCreatedEmail({
      to: host.email,
      propertyTitle: property.title,
      checkIn,
      checkOut,
    });
  }
  revalidatePath("/guest/bookings");
  revalidatePath("/host/bookings");
  revalidatePath("/admin/bookings");
  redirect(`/guest/bookings/${booking.id}`);
}
