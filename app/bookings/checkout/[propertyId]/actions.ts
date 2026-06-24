"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAvailabilityBlocks } from "@/lib/availability";
import { hasAvailabilityBlockConflict } from "@/lib/availability-calendar";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { getBookings, hasDateConflict } from "@/lib/bookings";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { assertValidCsrfForm } from "@/lib/csrf";
import { createBookingInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { env } from "@/lib/env";
import { sendBookingConfirmedEmail, sendBookingReceivedEmail, sendBookingRequestEmail } from "@/lib/email";
import { arePaidBookingsEnabled } from "@/lib/payments";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { getUserById } from "@/lib/users";
import { allowsPackageBooking, allowsStayBooking, calculateNightlySubtotal, calculatePackageSubtotal, calculateStayprimeMarkup, findBookingPackageById, getBestDiscount, getEnabledBookingPackages, getFullAccessBookingPackage } from "@/lib/pricing";
import { getPropertyById } from "@/lib/properties";
import type { Booking, Property, User } from "@/lib/types";

function isIsoDate(value: string) {
  const raw = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;

  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === raw;
}

function dateTime(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function checkoutPath(propertyId: string, checkIn: string, checkOut: string, guests: number, packageId?: string | null, error?: string) {
  const params = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
  if (packageId) params.set("packageId", packageId);
  if (error) params.set("error", error);
  return `/bookings/checkout/${propertyId}?${params.toString()}`;
}

function bookingEmailDetails({
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
  host?: User | null;
  to: string;
  actionPath: string;
}) {
  return {
    to,
    recipientName: guest.name,
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
    hostName: host?.name,
    guestName: guest.name,
  };
}

const bookingFormSchema = z.object({
  propertyId: z.string().trim().min(1).max(120),
  checkIn: z.string().trim().refine(isIsoDate, "Use a valid check-in date."),
  checkOut: z.string().trim().refine(isIsoDate, "Use a valid check-out date."),
  guests: z.coerce.number().int().min(1).max(50),
  packageId: z.string().trim().max(120).optional(),
});

export async function createBooking(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const parsed = bookingFormSchema.safeParse({
    propertyId: formData.get("propertyId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    guests: formData.get("guests"),
    packageId: formData.get("packageId") || undefined,
  });
  if (!parsed.success) throw new Error("Please complete your booking details.");

  const { propertyId, checkIn, checkOut, guests, packageId } = parsed.data;
  const checkInTime = dateTime(checkIn);
  const checkOutTime = dateTime(checkOut);
  const property = await getPropertyById(propertyId);
  const [bookings, availabilityBlocks] = await Promise.all([getBookings(), getAvailabilityBlocks()]);
  const user = await requireRole("guest", {
    redirectTo: `/register?role=guest&next=${encodeURIComponent(checkoutPath(propertyId, checkIn, checkOut, guests, packageId))}`,
    forbiddenRedirectTo: checkoutPath(propertyId, checkIn, checkOut, guests, packageId, "guest-only"),
  });
  requireVerifiedEmail(user);
  if (!property) throw new Error("Please complete your booking details.");
  if (property.status !== "approved") throw new Error("This listing is not available for booking.");
  if (!Number.isFinite(property.pricePerNight) || property.pricePerNight <= 0) throw new Error("This listing is missing valid pricing.");
  const enabledPackages = getEnabledBookingPackages(property);
  const stayBookingAllowed = allowsStayBooking(property);
  const packageBookingAllowed = allowsPackageBooking(property);
  let bookingPackage = packageId && packageBookingAllowed ? findBookingPackageById(property, packageId) : null;
  if (packageId && !bookingPackage) throw new Error("Please choose an available booking package.");
  if (!bookingPackage && !stayBookingAllowed && packageBookingAllowed) bookingPackage = enabledPackages[0] ?? null;
  if (!bookingPackage && !stayBookingAllowed) throw new Error("Please choose a booking package for this listing.");
  if (bookingPackage?.unit === "day" && checkOut !== addDays(checkIn, 1)) {
    bookingPackage = getFullAccessBookingPackage(enabledPackages);
    if (!bookingPackage) throw new Error("Full access is required for multi-day bookings.");
  }
  const maxGuests = bookingPackage?.maxGuests ?? property.maxGuests;
  if (!Number.isInteger(maxGuests) || guests > maxGuests) throw new Error("Guest count exceeds this listing's capacity.");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (checkInTime < today.getTime()) throw new Error("Check-in must be today or later.");
  if (checkOutTime <= checkInTime) throw new Error("Check-out must be after check-in.");
  if (bookingPackage?.availableDays?.length) {
    const checkInDay = new Date(`${checkIn}T00:00:00.000Z`).getUTCDay();
    if (!bookingPackage.availableDays.includes(checkInDay)) throw new Error("This package is not available on the selected day.");
  }
  if (bookingPackage?.minimumAdvanceBookingDays) {
    const minimumCheckInTime = today.getTime() + bookingPackage.minimumAdvanceBookingDays * 86400000;
    if (checkInTime < minimumCheckInTime) throw new Error("This package requires more advance notice.");
  }
  if (hasDateConflict(bookings, propertyId, checkIn, checkOut, bookingPackage?.id, property.bookingPackages ?? [])) throw new Error("Those dates are no longer available.");
  if (hasAvailabilityBlockConflict(availabilityBlocks, propertyId, checkIn, checkOut)) throw new Error("Those dates are no longer available.");

  const { nights, subtotal } = bookingPackage
    ? calculatePackageSubtotal(bookingPackage, checkIn, checkOut, guests)
    : calculateNightlySubtotal(property, checkIn, checkOut);
  if (nights > 90) throw new Error("Stays longer than 90 nights need host approval.");
  const discount = getBestDiscount({ property, bookings, checkIn, nights, subtotal });
  const discountedSubtotal = subtotal - (discount?.amount ?? 0);
  const serviceFee = calculateStayprimeMarkup(discountedSubtotal);
  const totalPrice = discountedSubtotal + serviceFee;
  if (!Number.isSafeInteger(totalPrice) || totalPrice <= 0) throw new Error("This booking total could not be calculated.");
  const requiresProviderPayment = arePaidBookingsEnabled();
  const bookingStatus = !requiresProviderPayment && property.rules.includes("Instant book enabled") ? "confirmed" : "pending";
  const booking: Booking = {
    id: randomUUID(),
    propertyId,
    guestId: user.id,
    hostId: property.hostId,
    checkIn,
    checkOut,
    guests,
    totalPrice,
    status: bookingStatus,
    paymentStatus: "pending",
    createdAt: new Date().toISOString().slice(0, 10),
    bookingPackageId: bookingPackage?.id,
    bookingPackageName: bookingPackage?.name,
    bookingPackageUnit: bookingPackage?.unit,
  };

  if (usesPrismaPersistence()) {
    await createBookingInDatabase(booking);
  } else {
    const [latestBookings, latestAvailabilityBlocks] = await Promise.all([readStoredBookings(), getAvailabilityBlocks()]);
    if (hasDateConflict(latestBookings, propertyId, checkIn, checkOut, bookingPackage?.id, property.bookingPackages ?? [])) throw new Error("Those dates are no longer available.");
    if (hasAvailabilityBlockConflict(latestAvailabilityBlocks, propertyId, checkIn, checkOut)) throw new Error("Those dates are no longer available.");
    await writeStoredBookings([booking, ...latestBookings]);
  }
  const guest = await getUserById(user.id);
  const host = await getUserById(property.hostId);
  if (guest) {
    const guestEmail = bookingEmailDetails({
      booking,
      property,
      guest,
      host,
      to: guest.email,
      actionPath: `/guest/bookings/${booking.id}`,
    });
    if (booking.status === "confirmed") {
      await sendBookingConfirmedEmail({ ...guestEmail, recipientRole: "guest" });
    } else {
      await sendBookingReceivedEmail({ ...guestEmail, propertyAddress: undefined });
    }
  }
  if (host) {
    const hostEmail = bookingEmailDetails({
      booking,
      property,
      guest: guest ?? user,
      host,
      to: host.email,
      actionPath: "/host/bookings",
    });
    if (booking.status === "confirmed") {
      await sendBookingConfirmedEmail({ ...hostEmail, recipientRole: "host" });
    } else {
      await sendBookingRequestEmail(hostEmail);
    }
  }
  revalidatePath("/guest/bookings");
  revalidatePath("/host/bookings");
  revalidatePath("/admin/bookings");
  redirect(`/guest/bookings/${booking.id}`);
}
