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
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { assertUniquePaymentReference } from "@/lib/payment-references";
import { getProperties } from "@/lib/properties";
import {
  createBookingInDatabase,
  createUserInDatabase,
  listPaymentsFromDatabase,
  recordManualPaymentInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import type { Booking, Payment, PaymentMethod, Property, User } from "@/lib/types";
import { getUsers } from "@/lib/users";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";

function isIsoDate(value: string) {
  const raw = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === raw;
}

function dateTime(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function localGuestEmail(id: string) {
  return `external-${id}@stayprimeph.local`;
}

function findEnabledPackage(property: Property, packageId?: string) {
  const enabledPackages = property.bookingPackages?.filter((item) => item.enabled) ?? [];
  if (!packageId) return enabledPackages[0];
  return enabledPackages.find((item) => item.id === packageId);
}

async function getOrCreateExternalGuest({
  email,
  name,
  phone,
}: {
  email?: string;
  name: string;
  phone?: string;
}) {
  const normalizedEmail = email?.trim().toLowerCase();
  const users = await getUsers();
  const existing = normalizedEmail ? users.find((user) => user.email.toLowerCase() === normalizedEmail) : null;
  if (existing) return existing;

  const id = randomUUID();
  const user: User = {
    id,
    name,
    email: normalizedEmail || localGuestEmail(id),
    role: "guest",
    avatar: "",
    phone: phone ?? "",
    createdAt: new Date().toISOString().slice(0, 10),
    emailVerifiedAt: normalizedEmail ? new Date().toISOString() : undefined,
  };

  if (usesPrismaPersistence()) {
    await createUserInDatabase(user);
  } else {
    const storedUsers = await readStoredUsers();
    await writeStoredUsers([user, ...storedUsers]);
  }

  return user;
}

const externalReservationSchema = z.object({
  propertyId: z.string().trim().min(1, "Choose a listing."),
  bookingPackageId: z.string().trim().optional(),
  guestName: z.string().trim().min(2, "Enter the guest name.").max(120),
  guestEmail: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  guestPhone: z.string().trim().max(60).optional(),
  checkIn: z.string().trim().refine(isIsoDate, "Use a valid check-in date."),
  checkOut: z.string().trim().refine(isIsoDate, "Use a valid check-out date."),
  guests: z.coerce.number().int().min(1).max(50),
  totalPrice: z.coerce.number().positive("Enter the outside transaction amount."),
  paymentMethod: z.enum(["gcash", "bank_transfer", "other"]),
  transactionId: z.string().trim().min(2, "Enter a receipt or transaction reference.").max(180),
  notes: z.string().trim().max(500).optional(),
});

export async function createExternalReservation(formData: FormData) {
  await assertTrustedRequestOrigin();

  const user = await requireRole(["host", "admin"], { forbiddenMessage: "Only hosts can create external reservations." });
  requireVerifiedEmail(user);

  const parsed = externalReservationSchema.safeParse({
    propertyId: formData.get("propertyId"),
    bookingPackageId: formData.get("bookingPackageId") || undefined,
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail") || undefined,
    guestPhone: formData.get("guestPhone") || undefined,
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    guests: formData.get("guests"),
    totalPrice: formData.get("totalPrice"),
    paymentMethod: formData.get("paymentMethod"),
    transactionId: formData.get("transactionId"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please complete the reservation form.");

  const data = parsed.data;
  const [properties, bookings, availabilityBlocks] = await Promise.all([getProperties(), getBookings(), getAvailabilityBlocks()]);
  const isAdmin = user.role === "admin";
  const property = properties.find((item) => item.id === data.propertyId && (isAdmin || item.hostId === user.id));
  if (!property) throw new Error("Listing not found.");
  if (property.status !== "approved") throw new Error("Only approved listings can receive reservations.");

  const requestedPackageId = data.bookingPackageId?.trim();
  const bookingPackage = requestedPackageId ? findEnabledPackage(property, requestedPackageId) : findEnabledPackage(property);
  if (requestedPackageId && !bookingPackage) throw new Error("Selected booking package does not belong to this listing.");
  const maxGuests = bookingPackage?.maxGuests ?? property.maxGuests;
  if (data.guests > maxGuests) throw new Error("Guest count exceeds this listing capacity.");
  if (dateTime(data.checkOut) <= dateTime(data.checkIn)) throw new Error("Check-out must be after check-in.");
  if (hasDateConflict(bookings, data.propertyId, data.checkIn, data.checkOut)) throw new Error("Those dates are already booked.");
  if (hasAvailabilityBlockConflict(availabilityBlocks, data.propertyId, data.checkIn, data.checkOut)) throw new Error("Those dates are blocked on the calendar.");

  const guest = await getOrCreateExternalGuest({
    email: data.guestEmail || undefined,
    name: data.guestName,
    phone: data.guestPhone,
  });
  const now = new Date().toISOString();
  const booking: Booking = {
    id: randomUUID(),
    propertyId: property.id,
    guestId: guest.id,
    hostId: property.hostId,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    guests: data.guests,
    totalPrice: Math.round(data.totalPrice),
    status: "pending",
    paymentStatus: "submitted",
    createdAt: now.slice(0, 10),
    bookingPackageId: bookingPackage?.id,
    bookingPackageName: bookingPackage?.name,
    bookingPackageUnit: bookingPackage?.unit,
  };
  const payment: Payment = {
    id: `payment-${booking.id}`,
    bookingId: booking.id,
    guestId: guest.id,
    hostId: property.hostId,
    amount: booking.totalPrice,
    paymentMethod: data.paymentMethod as PaymentMethod,
    paymentStatus: "submitted",
    transactionId: data.transactionId,
    notes: data.notes ? `External reservation: ${data.notes}` : "External reservation recorded by host.",
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  if (usesPrismaPersistence()) {
    const latestPayments = await listPaymentsFromDatabase();
    assertUniquePaymentReference(latestPayments, {
      bookingId: booking.id,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
    });
    await createBookingInDatabase(booking);
    await recordManualPaymentInDatabase(booking, {
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      notes: payment.notes,
    });
  } else {
    const [latestBookings, latestBlocks, latestPayments] = await Promise.all([readStoredBookings(), getAvailabilityBlocks(), readStoredPayments()]);
    if (hasDateConflict(latestBookings, data.propertyId, data.checkIn, data.checkOut)) throw new Error("Those dates are already booked.");
    if (hasAvailabilityBlockConflict(latestBlocks, data.propertyId, data.checkIn, data.checkOut)) throw new Error("Those dates are blocked on the calendar.");
    assertUniquePaymentReference(latestPayments, {
      bookingId: booking.id,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
    });
    await writeStoredBookings([booking, ...latestBookings]);
    await writeStoredPayments([payment, ...latestPayments.filter((item) => item.bookingId !== booking.id)]);
  }

  revalidatePath("/host/erp");
  revalidatePath("/host/erp/reservations");
  revalidatePath("/host/bookings");
  revalidatePath("/host/calendar");
  revalidatePath("/host/reports");
  revalidatePath("/admin/bookings");
  revalidatePath(`/rooms/${property.id}`);
  revalidatePath(`/properties/${property.id}`);
  revalidatePath(`/property/${property.slug}`);
  revalidatePath("/search");
  redirect(`/host/erp/reservations?month=${data.checkIn.slice(0, 7)}&status=pending`);
}
