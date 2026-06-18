"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { assertValidCsrfForm } from "@/lib/csrf";
import { createMessage } from "@/lib/messages";
import { getPropertyById } from "@/lib/properties";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";

function cleanMessage(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export async function sendHostMessage(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const propertyId = String(formData.get("propertyId") ?? "");
  const body = cleanMessage(formData.get("message"));
  const user = await requireRole("guest", {
    redirectTo: "/login?role=guest",
    forbiddenMessage: "Only guests can message hosts from this page.",
  });
  requireVerifiedEmail(user);
  if (!body) redirect(`/guest/messages?propertyId=${encodeURIComponent(propertyId)}&error=${encodeURIComponent("Write a message before sending.")}`);

  const property = await getPropertyById(propertyId);
  if (!property) throw new Error("Listing not found.");
  if (property.hostId === user.id) throw new Error("You cannot message your own listing.");

  const bookings = await getBookings();
  const booking = bookings.find(
    (item) =>
      item.propertyId === property.id &&
      item.guestId === user.id &&
      item.hostId === property.hostId &&
      item.status !== "cancelled",
  );

  await createMessage({
    id: randomUUID(),
    senderId: user.id,
    receiverId: property.hostId,
    bookingId: booking?.id,
    propertyId: property.id,
    message: body,
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/guest/messages");
  revalidatePath("/host/messages");
  redirect(`/guest/messages?propertyId=${encodeURIComponent(property.id)}&hostId=${encodeURIComponent(property.hostId)}`);
}
