"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBookingById } from "@/lib/bookings";
import { createMessage } from "@/lib/messages";
import { getPropertyById } from "@/lib/properties";
import { getUserById } from "@/lib/users";

function cleanMessage(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export async function sendGuestMessage(formData: FormData) {
  const guestId = String(formData.get("guestId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");
  const body = cleanMessage(formData.get("message"));
  const user = await getCurrentUser();

  if (!user) redirect("/login?role=host");
  if (user.role !== "host") throw new Error("Only hosts can reply from this page.");
  if (!body) redirect(`/host/messages?guestId=${encodeURIComponent(guestId)}&propertyId=${encodeURIComponent(propertyId)}&error=${encodeURIComponent("Write a reply before sending.")}`);

  const guest = await getUserById(guestId);
  if (!guest) throw new Error("Guest not found.");

  const booking = bookingId ? await getBookingById(bookingId) : null;
  const property = propertyId ? await getPropertyById(propertyId) : booking ? await getPropertyById(booking.propertyId) : null;

  if (booking && (booking.hostId !== user.id || booking.guestId !== guest.id)) throw new Error("Conversation not found.");
  if (!booking && (!property || property.hostId !== user.id)) throw new Error("Conversation not found.");

  await createMessage({
    id: randomUUID(),
    senderId: user.id,
    receiverId: guest.id,
    bookingId: booking?.id,
    propertyId: property?.id,
    message: body,
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/host/messages");
  revalidatePath("/guest/messages");
  const nextPropertyId = property?.id ?? propertyId;
  redirect(`/host/messages?guestId=${encodeURIComponent(guest.id)}${nextPropertyId ? `&propertyId=${encodeURIComponent(nextPropertyId)}` : ""}`);
}
