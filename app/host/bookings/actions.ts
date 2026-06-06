"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { getBookingById } from "@/lib/bookings";
import { confirmManualPayment, rejectManualPayment } from "@/lib/payments";
import { updateBookingStatusInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import type { BookingStatus } from "@/lib/types";

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
}

export async function acceptBooking(formData: FormData) {
  await updateHostBookingStatus(formData, "confirmed");
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
