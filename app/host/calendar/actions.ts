"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAvailabilityBlocks, deleteAvailabilityBlock, getAvailabilityBlocks } from "@/lib/availability";
import {
  getBlockedDateKeys,
  hasAvailabilityBlockConflict,
} from "@/lib/availability-calendar";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { getBookings, hasDateConflict } from "@/lib/bookings";
import { assertValidCsrfForm } from "@/lib/csrf";
import { getPropertyById } from "@/lib/properties";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import type { AvailabilityBlock, AvailabilityBlockReason } from "@/lib/types";

export type AvailabilityFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const availabilityReasons = ["booked_elsewhere", "owner_use", "maintenance", "other"] as const;

const blockAvailabilitySchema = z.object({
  propertyId: z.string().trim().min(1, "Choose a listing."),
  checkIn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid start date."),
  checkOut: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid end date."),
  reason: z.enum(availabilityReasons),
  note: z.string().trim().max(240).optional(),
});

function dateTime(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function cleanNote(value?: string) {
  return value?.trim() || undefined;
}

function actionError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function requireHostForAvailability() {
  const user = await requireRole("host", {
    message: "Use a host account to update availability.",
    forbiddenMessage: "Use a host account to update availability.",
  });
  requireVerifiedEmail(user);
  return user;
}

export async function blockHostAvailability(_state: AvailabilityFormState, formData: FormData): Promise<AvailabilityFormState> {
  try {
    await assertTrustedRequestOrigin();
    await assertValidCsrfForm(formData);
  } catch (error) {
    return { status: "error", message: actionError(error, "Request origin could not be verified.") };
  }

  const parsed = blockAvailabilitySchema.safeParse({
    propertyId: formData.get("propertyId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    reason: formData.get("reason"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the unavailable date details." };
  }

  let user;
  try {
    user = await requireHostForAvailability();
  } catch (error) {
    return { status: "error", message: actionError(error, "Use a host account to update availability.") };
  }

  const { propertyId, checkIn, checkOut, reason, note } = parsed.data;
  const property = await getPropertyById(propertyId);
  if (!property || property.hostId !== user.id) return { status: "error", message: "Choose one of your listings." };

  const checkInTime = dateTime(checkIn);
  const checkOutTime = dateTime(checkOut);
  if (!Number.isFinite(checkInTime) || !Number.isFinite(checkOutTime) || checkOutTime <= checkInTime) {
    return { status: "error", message: "End date must be after the start date." };
  }

  const dateKeys = getBlockedDateKeys(checkIn, checkOut);
  if (dateKeys.length > 180) return { status: "error", message: "Block 180 nights or fewer at a time." };

  const [bookings, availabilityBlocks] = await Promise.all([getBookings(), getAvailabilityBlocks()]);
  if (hasDateConflict(bookings, propertyId, checkIn, checkOut)) {
    return { status: "error", message: "Those dates already have reservations. Decline pending requests or contact support for confirmed bookings first." };
  }
  if (hasAvailabilityBlockConflict(availabilityBlocks, propertyId, checkIn, checkOut)) {
    return { status: "error", message: "Some of those dates are already marked unavailable." };
  }

  const createdAt = new Date().toISOString();
  const blocks: AvailabilityBlock[] = dateKeys.map((date) => ({
    id: randomUUID(),
    propertyId,
    date,
    reason: reason as AvailabilityBlockReason,
    note: cleanNote(note),
    createdAt,
  }));

  await createAvailabilityBlocks(blocks);
  revalidatePath("/host/calendar");
  revalidatePath(`/rooms/${propertyId}`);
  return { status: "success", message: `${dateKeys.length} night${dateKeys.length === 1 ? "" : "s"} marked unavailable.` };
}

export async function removeHostAvailabilityBlock(formData: FormData) {
  try {
    await assertTrustedRequestOrigin();
    await assertValidCsrfForm(formData);
  } catch {
    return;
  }

  const blockId = String(formData.get("blockId") ?? "");
  if (!blockId) return;

  let user;
  try {
    user = await requireHostForAvailability();
  } catch {
    return;
  }

  const blocks = await getAvailabilityBlocks();
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;

  const property = await getPropertyById(block.propertyId);
  if (!property || property.hostId !== user.id) return;

  await deleteAvailabilityBlock(blockId);
  revalidatePath("/host/calendar");
}
