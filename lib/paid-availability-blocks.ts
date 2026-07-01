import { getNightlyRateDetails } from "@/lib/pricing";
import type { AvailabilityBlock, BookingPackage, Property } from "@/lib/types";

const dayMs = 86_400_000;

export type PaidAvailabilityBlock = {
  id: string;
  propertyId: string;
  hostId: string;
  propertyTitle: string;
  date: string;
  checkIn: string;
  checkOut: string;
  reason: AvailabilityBlock["reason"];
  reasonLabel: string;
  bookingPackageId?: string;
  bookingPackageName?: string;
  totalPrice: number;
};

export function isPaidAvailabilityBlockReason(reason: AvailabilityBlock["reason"]) {
  return reason === "booked_by_guest" || reason === "booked_elsewhere";
}

export function paidAvailabilityBlockReasonLabel(reason: AvailabilityBlock["reason"]) {
  if (reason === "booked_by_guest") return "Booked by guest";
  if (reason === "booked_elsewhere") return "Booked on another platform";
  return "Paid blocked date";
}

export function paidAvailabilityBlocksForProperties(blocks: AvailabilityBlock[], properties: Property[]): PaidAvailabilityBlock[] {
  const propertyById = new Map(properties.map((property) => [property.id, property]));

  return blocks
    .filter((block) => isPaidAvailabilityBlockReason(block.reason))
    .map((block) => {
      const property = propertyById.get(block.propertyId);
      if (!property) return null;

      const bookingPackage = findPackage(property, block.bookingPackageId);
      const rateDetails = bookingPackage
        ? getNightlyRateDetails(packageRates(property, bookingPackage), block.date)
        : getNightlyRateDetails(property, block.date);

      const paidBlock: PaidAvailabilityBlock = {
        id: block.id,
        propertyId: block.propertyId,
        hostId: property.hostId,
        propertyTitle: property.title,
        date: block.date,
        checkIn: block.date,
        checkOut: addDays(block.date, 1),
        reason: block.reason,
        reasonLabel: paidAvailabilityBlockReasonLabel(block.reason),
        totalPrice: Math.max(0, Math.round(rateDetails.netRate)),
      };
      const bookingPackageName = block.bookingPackageName ?? bookingPackage?.name;
      if (block.bookingPackageId) paidBlock.bookingPackageId = block.bookingPackageId;
      if (bookingPackageName) paidBlock.bookingPackageName = bookingPackageName;
      return paidBlock;
    })
    .filter((block): block is PaidAvailabilityBlock => Boolean(block))
    .sort((a, b) => a.date.localeCompare(b.date) || a.propertyTitle.localeCompare(b.propertyTitle) || a.id.localeCompare(b.id));
}

function findPackage(property: Pick<Property, "bookingPackages">, packageId?: string) {
  if (!packageId) return null;
  return (property.bookingPackages ?? []).find((bookingPackage) => bookingPackage.id === packageId) ?? null;
}

function packageRates(property: Pick<Property, "rateAdjustments">, bookingPackage: BookingPackage) {
  return {
    pricePerNight: bookingPackage.weekdayRate,
    weekendPrice: bookingPackage.weekendRate > 0 ? bookingPackage.weekendRate : bookingPackage.weekdayRate,
    holidayPrice: bookingPackage.holidayRate,
    holidayDates: bookingPackage.holidayDates,
    seasonalRates: bookingPackage.seasonalRates,
    rateAdjustments: property.rateAdjustments,
  };
}

function addDays(dateKey: string, days: number) {
  const time = new Date(`${dateKey}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(time)) return dateKey;
  return new Date(time + days * dayMs).toISOString().slice(0, 10);
}
