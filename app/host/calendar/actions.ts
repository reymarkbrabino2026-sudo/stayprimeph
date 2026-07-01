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
import { getPropertyById, revalidatePublicListingSummaries } from "@/lib/properties";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { saveListingRateAdjustments } from "@/lib/rate-adjustments";
import { updatePropertyDetailsInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import type { AvailabilityBlock, AvailabilityBlockReason, BookingPackage, ListingRateAdjustment, Property, SeasonalRate } from "@/lib/types";

export type AvailabilityFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type RateCalendarFormState = AvailabilityFormState;

const availabilityReasons = ["booked_elsewhere", "booked_by_guest", "owner_use", "maintenance", "other"] as const;
const selectedDateRateTypes = ["custom_price", "percent_discount"] as const;

const blockAvailabilitySchema = z.object({
  propertyId: z.string().trim().min(1, "Choose a listing."),
  checkIn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid start date."),
  checkOut: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid end date."),
  reason: z.enum(availabilityReasons),
  note: z.string().trim().max(240).optional(),
});

const monthlyRateSchema = z.object({
  propertyId: z.string().trim().min(1, "Choose a listing."),
  packageId: z.string().trim().optional(),
  month: z.string().trim().regex(/^\d{4}-\d{2}$/, "Choose a valid month."),
  rate: z.coerce.number().int().min(1, "Enter a monthly price.").max(1000000, "Monthly price is too high.").optional(),
  weekdayRate: z.coerce.number().int().min(1, "Enter a weekday price.").max(1000000, "Weekday price is too high.").optional(),
  weekendRate: z.coerce.number().int().min(1, "Enter a weekend price.").max(1000000, "Weekend price is too high.").optional(),
});

const packageRateSchema = z.object({
  propertyId: z.string().trim().min(1, "Choose a listing."),
  packageId: z.string().trim().min(1, "Choose a booking package."),
  weekdayRate: z.coerce.number().min(1, "Enter a weekday package price.").max(1000000, "Weekday package price is too high.").transform(Math.round),
  weekendRate: z.coerce.number().min(0, "Weekend package price cannot be negative.").max(1000000, "Weekend package price is too high.").transform(Math.round),
  holidayRate: z.coerce.number().min(0, "Holiday package price cannot be negative.").max(1000000, "Holiday package price is too high.").transform(Math.round),
});

const selectedDateRateSchema = z.object({
  propertyId: z.string().trim().min(1, "Choose a listing."),
  checkIn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid start date."),
  checkOut: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid end date."),
  adjustmentType: z.enum(selectedDateRateTypes),
  name: z.string().trim().max(80).optional(),
  amount: z.coerce.number().int().min(1, "Enter an amount.").max(1000000, "Amount is too high."),
  active: z.boolean().catch(true),
});

function dateTime(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function dateKeyFromTime(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  return dateKeyFromTime(dateTime(value) + days * 86400000);
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return { startDate, endDate };
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function monthlyPackageSeasonalRateId(packageId: string, month: string) {
  return `monthly-package-${packageId}-${month}`;
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

async function requireHostProperty(propertyId: string) {
  const user = await requireHostForAvailability();
  const property = await getPropertyById(propertyId);
  if (!property || property.hostId !== user.id || property.status === "deleted") throw new Error("Choose one of your listings.");
  return property;
}

function currentRateAdjustments(property: Property) {
  return property.rateAdjustments ?? [];
}

function activeBookingPackages(property: Property) {
  return (property.bookingPackages ?? []).filter((pkg) => pkg.enabled && pkg.status !== "inactive");
}

async function savePropertyBookingPackages(property: Property, bookingPackages: BookingPackage[]) {
  const nextProperty = { ...property, bookingPackages };

  if (usesPrismaPersistence()) {
    await updatePropertyDetailsInDatabase(nextProperty);
    return nextProperty;
  }

  const storedProperties = await readStoredProperties();
  await writeStoredProperties(storedProperties.map((item) => (
    item.id === property.id ? nextProperty : item
  )));
  return nextProperty;
}

function sortedRateAdjustments(adjustments: ListingRateAdjustment[]) {
  return [...adjustments].sort((a, b) =>
    a.startDate.localeCompare(b.startDate) ||
    a.endDate.localeCompare(b.endDate) ||
    a.type.localeCompare(b.type) ||
    a.name.localeCompare(b.name),
  );
}

function sortedSeasonalRates(rates: SeasonalRate[]) {
  return [...rates].sort((a, b) =>
    a.startDate.localeCompare(b.startDate) ||
    a.endDate.localeCompare(b.endDate) ||
    a.name.localeCompare(b.name) ||
    (a.id ?? "").localeCompare(b.id ?? ""),
  );
}

function revalidateCalendarPricing(property: Property) {
  revalidatePublicListingSummaries();
  revalidatePath("/host/calendar");
  revalidatePath(`/rooms/${property.id}`);
  revalidatePath(`/property/${property.slug}`);
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
  if (!property || property.hostId !== user.id || property.status === "deleted") return { status: "error", message: "Choose one of your listings." };

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

export async function saveMonthlyHostRate(_state: RateCalendarFormState, formData: FormData): Promise<RateCalendarFormState> {
  try {
    await assertTrustedRequestOrigin();
    await assertValidCsrfForm(formData);
  } catch (error) {
    return { status: "error", message: actionError(error, "Request origin could not be verified.") };
  }

  const parsed = monthlyRateSchema.safeParse({
    propertyId: formData.get("propertyId"),
    packageId: formData.get("packageId") || undefined,
    month: formData.get("month"),
    rate: formData.get("rate") || undefined,
    weekdayRate: formData.get("weekdayRate") || undefined,
    weekendRate: formData.get("weekendRate") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the monthly rate details." };
  }

  const weekdayRate = parsed.data.weekdayRate ?? parsed.data.rate;
  const weekendRate = parsed.data.weekendRate ?? parsed.data.rate ?? weekdayRate;
  if (!weekdayRate || !weekendRate) {
    return { status: "error", message: "Enter weekday and weekend prices for the month." };
  }

  let property;
  try {
    property = await requireHostProperty(parsed.data.propertyId);
  } catch (error) {
    return { status: "error", message: actionError(error, "Choose one of your listings.") };
  }

  const { startDate, endDate } = monthRange(parsed.data.month);
  const selectedMonthLabel = monthLabel(parsed.data.month);

  if (parsed.data.packageId) {
    const packages = property.bookingPackages ?? [];
    const selectedPackage = activeBookingPackages(property).find((pkg) => pkg.id === parsed.data.packageId);
    if (!selectedPackage) return { status: "error", message: "Choose an active booking package for this listing." };

    const monthlyRate: SeasonalRate = {
      id: monthlyPackageSeasonalRateId(selectedPackage.id, parsed.data.month),
      name: `${selectedMonthLabel} rate`,
      startDate,
      endDate,
      weekdayRate,
      weekendRate,
      holidayRate: weekendRate,
    };

    await savePropertyBookingPackages(property, packages.map((pkg) => (
      pkg.id === selectedPackage.id
        ? {
            ...pkg,
            seasonalRates: sortedSeasonalRates([
              ...(pkg.seasonalRates ?? []).filter((rate) =>
                rate.id !== monthlyRate.id &&
                !(rate.startDate === startDate && rate.endDate === endDate),
              ),
              monthlyRate,
            ]),
          }
        : pkg
    )));
    revalidateCalendarPricing(property);
    return { status: "success", message: `${selectedPackage.name} ${selectedMonthLabel} price saved.` };
  }

  const existing = currentRateAdjustments(property).find((adjustment) =>
    adjustment.type === "monthly" &&
    adjustment.startDate === startDate &&
    adjustment.endDate === endDate,
  );
  const monthlyRate: ListingRateAdjustment = {
    id: existing?.id ?? `monthly-${property.id}-${parsed.data.month}`,
    type: "monthly",
    name: `${selectedMonthLabel} rate`,
    startDate,
    endDate,
    active: true,
    weekdayRate,
    weekendRate,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const nextAdjustments = sortedRateAdjustments([
    ...currentRateAdjustments(property).filter((adjustment) => adjustment.id !== monthlyRate.id),
    monthlyRate,
  ]);

  await saveListingRateAdjustments(property, nextAdjustments);
  revalidateCalendarPricing(property);
  return { status: "success", message: `${selectedMonthLabel} rate saved.` };
}

export async function saveBookingPackageRates(_state: RateCalendarFormState, formData: FormData): Promise<RateCalendarFormState> {
  try {
    await assertTrustedRequestOrigin();
    await assertValidCsrfForm(formData);
  } catch (error) {
    return { status: "error", message: actionError(error, "Request origin could not be verified.") };
  }

  const parsed = packageRateSchema.safeParse({
    propertyId: formData.get("propertyId"),
    packageId: formData.get("packageId"),
    weekdayRate: formData.get("weekdayRate"),
    weekendRate: formData.get("weekendRate") || "0",
    holidayRate: formData.get("holidayRate") || "0",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the package price details." };
  }

  let property;
  try {
    property = await requireHostProperty(parsed.data.propertyId);
  } catch (error) {
    return { status: "error", message: actionError(error, "Choose one of your listings.") };
  }

  const packages = property.bookingPackages ?? [];
  const selectedPackage = activeBookingPackages(property).find((pkg) => pkg.id === parsed.data.packageId);
  if (!selectedPackage) return { status: "error", message: "Choose an active booking package for this listing." };

  await savePropertyBookingPackages(property, packages.map((pkg) => (
    pkg.id === selectedPackage.id
      ? {
          ...pkg,
          weekdayRate: parsed.data.weekdayRate,
          weekendRate: parsed.data.weekendRate,
          holidayRate: parsed.data.holidayRate,
        }
      : pkg
  )));
  revalidateCalendarPricing(property);

  return { status: "success", message: `${selectedPackage.name} package prices saved.` };
}

export async function saveSelectedDateHostRate(_state: RateCalendarFormState, formData: FormData): Promise<RateCalendarFormState> {
  try {
    await assertTrustedRequestOrigin();
    await assertValidCsrfForm(formData);
  } catch (error) {
    return { status: "error", message: actionError(error, "Request origin could not be verified.") };
  }

  const parsed = selectedDateRateSchema.safeParse({
    propertyId: formData.get("propertyId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adjustmentType: formData.get("adjustmentType"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the selected date rate details." };
  }

  let property;
  try {
    property = await requireHostProperty(parsed.data.propertyId);
  } catch (error) {
    return { status: "error", message: actionError(error, "Choose one of your listings.") };
  }

  const checkInTime = dateTime(parsed.data.checkIn);
  const checkOutTime = dateTime(parsed.data.checkOut);
  if (!Number.isFinite(checkInTime) || !Number.isFinite(checkOutTime) || checkOutTime <= checkInTime) {
    return { status: "error", message: "End date must be after the start date." };
  }

  const nights = Math.round((checkOutTime - checkInTime) / 86400000);
  if (nights > 180) return { status: "error", message: "Update 180 nights or fewer at a time." };

  const name = parsed.data.name?.trim() || (parsed.data.adjustmentType === "percent_discount" ? "Calendar promo" : "Custom date price");
  const adjustment: ListingRateAdjustment = parsed.data.adjustmentType === "percent_discount"
    ? {
        id: randomUUID(),
        type: "discount",
        name,
        startDate: parsed.data.checkIn,
        endDate: addDays(parsed.data.checkOut, -1),
        active: parsed.data.active,
        discountPercent: Math.min(parsed.data.amount, 100),
        createdAt: new Date().toISOString(),
      }
    : {
        id: randomUUID(),
        type: "custom",
        name,
        startDate: parsed.data.checkIn,
        endDate: addDays(parsed.data.checkOut, -1),
        active: parsed.data.active,
        weekdayRate: parsed.data.amount,
        weekendRate: parsed.data.amount,
        createdAt: new Date().toISOString(),
      };

  await saveListingRateAdjustments(property, sortedRateAdjustments([...currentRateAdjustments(property), adjustment]));
  revalidateCalendarPricing(property);
  return {
    status: "success",
    message: parsed.data.adjustmentType === "percent_discount" ? "Selected-date discount saved." : "Selected-date price saved.",
  };
}

export async function setHostRateAdjustmentActive(formData: FormData) {
  try {
    await assertTrustedRequestOrigin();
    await assertValidCsrfForm(formData);
  } catch {
    return;
  }

  const propertyId = String(formData.get("propertyId") ?? "");
  const adjustmentId = String(formData.get("adjustmentId") ?? "");
  const active = formData.get("active") === "true";
  if (!propertyId || !adjustmentId) return;

  let property;
  try {
    property = await requireHostProperty(propertyId);
  } catch {
    return;
  }

  const nextAdjustments = currentRateAdjustments(property).map((adjustment) => (
    adjustment.id === adjustmentId ? { ...adjustment, active } : adjustment
  ));
  await saveListingRateAdjustments(property, nextAdjustments);
  revalidateCalendarPricing(property);
}

export async function deleteHostRateAdjustment(formData: FormData) {
  try {
    await assertTrustedRequestOrigin();
    await assertValidCsrfForm(formData);
  } catch {
    return;
  }

  const propertyId = String(formData.get("propertyId") ?? "");
  const adjustmentId = String(formData.get("adjustmentId") ?? "");
  if (!propertyId || !adjustmentId) return;

  let property;
  try {
    property = await requireHostProperty(propertyId);
  } catch {
    return;
  }

  await saveListingRateAdjustments(property, currentRateAdjustments(property).filter((adjustment) => adjustment.id !== adjustmentId));
  revalidateCalendarPricing(property);
}
