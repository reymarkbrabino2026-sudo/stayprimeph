import { z } from "zod";
import { maxListingPhotos, minListingPhotos } from "@/lib/host-wizard-limits";
import { listingPhotoCategoryIds } from "@/lib/listing-photo-categories";
import { isValidListingVideoUrl, normalizeListingVideoUrl } from "@/lib/listing-video";
import { isValidVirtualTourUrl, normalizeVirtualTourUrl } from "@/lib/virtual-tour";

const listingPhotoCategorySchema = z.enum(listingPhotoCategoryIds).catch("other");
const maxMoneyValue = 1000000;

function normalizeMoneyAmount(value: number) {
  return Math.round(value);
}

function hasAtMostTwoDecimalPlaces(value: number) {
  return Math.abs(value * 100 - Math.round(value * 100)) < Number.EPSILON * 100;
}

const moneyAmountSchema = (min = 0) =>
  z.number()
    .min(min)
    .max(maxMoneyValue)
    .refine(hasAtMostTwoDecimalPlaces, { message: "Use no more than 2 decimal places." })
    .transform(normalizeMoneyAmount);

const virtualTourUrlSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : "",
  z.string().max(2048),
).refine(isValidVirtualTourUrl, {
  message: "Enter a valid virtual tour link.",
}).transform((value) => normalizeVirtualTourUrl(value));

const listingVideoUrlSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : "",
  z.string().max(4096),
).refine(isValidListingVideoUrl, {
  message: "Paste a valid YouTube or Vimeo video link, or leave this blank.",
}).transform((value) => normalizeListingVideoUrl(value));

const seasonalRateSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekdayRate: moneyAmountSchema(),
  weekendRate: moneyAmountSchema(),
  holidayRate: moneyAmountSchema(),
}).refine((value) => value.endDate >= value.startDate, {
  message: "Season end date must be after the start date.",
  path: ["endDate"],
});

const bookingPackageSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  description: z.string().max(300),
  status: z.enum(["active", "inactive"]),
  displayOrder: z.number().int().min(0).max(100),
  accessType: z.string().min(1).max(120),
  unit: z.enum(["night", "day"]),
  weekdayRate: moneyAmountSchema(),
  weekendRate: moneyAmountSchema(),
  holidayRate: moneyAmountSchema(),
  holidayDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(80).catch([]),
  seasonalRates: z.array(seasonalRateSchema).max(12).catch([]),
  includedGuests: z.number().int().min(0).max(500),
  maxGuests: z.number().int().min(0).max(500),
  sleepingCapacity: z.number().int().min(0).max(500),
  durationHours: z.number().int().min(0).max(168),
  additionalGuestFee: moneyAmountSchema(),
  extensionHourlyFee: moneyAmountSchema(),
  checkInTime: z.string().min(1).max(40),
  checkOutTime: z.string().min(1).max(40),
  accessibleFloors: z.array(z.string().trim().min(1).max(80)).max(20),
  accessibleRoomIds: z.array(z.string().trim().min(1).max(100)).max(50),
  includedAmenities: z.array(z.string().trim().min(1).max(80)).max(80),
  excludedAmenities: z.array(z.string().trim().min(1).max(80)).max(80),
  availableDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  minimumAdvanceBookingDays: z.number().int().min(0).max(365),
  blockedPackageIds: z.array(z.string().trim().min(1).max(100)).max(20),
  enabled: z.boolean(),
}).superRefine((value, context) => {
  if (value.maxGuests < value.includedGuests) {
    context.addIssue({
      code: "custom",
      message: "Maximum guests must be greater than or equal to included guests.",
      path: ["maxGuests"],
    });
  }

  if (!value.enabled || value.status === "inactive") return;

  if (value.weekdayRate < 1) {
    context.addIssue({
      code: "custom",
      message: "Enter a weekday rate for this package.",
      path: ["weekdayRate"],
    });
  }
  if (value.includedGuests < 1) {
    context.addIssue({
      code: "custom",
      message: "Enter how many guests are included.",
      path: ["includedGuests"],
    });
  }
  if (value.maxGuests < 1) {
    context.addIssue({
      code: "custom",
      message: "Enter the maximum guests.",
      path: ["maxGuests"],
    });
  }
  if (value.durationHours < 1) {
    context.addIssue({
      code: "custom",
      message: "Enter the package length.",
      path: ["durationHours"],
    });
  }
});

const propertyRoomSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  capacity: z.number().int().min(1).max(100),
  floor: z.string().min(1).max(80),
  description: z.string().max(300),
  photos: z.array(z.string().trim().max(2048)).max(12),
  amenities: z.array(z.string().trim().max(80)).max(30),
  active: z.boolean(),
});

const hostListingAddressFields = {
  country: z.string().min(1).max(80),
  street: z.string().min(3).max(160),
  barangay: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  province: z.string().min(1).max(80),
  zipCode: z.string().min(3).max(16),
};

export const hostListingAddressSchema = z.object(hostListingAddressFields);

export const hostListingSchema = z.object({
  uploadScopeId: z.string().min(1).max(120),
  ...hostListingAddressFields,
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), locationConfirmed: z.literal(true), locationConfirmedAddress: z.string().min(1).max(600), propertyType: z.string().min(1).max(80), privacyType: z.string().min(1).max(80), preciseLocation: z.boolean(),
  guests: z.number().int().min(1).max(50), bedrooms: z.number().int().min(0).max(50), beds: z.number().int().min(1).max(100), bathrooms: z.number().min(1).max(50), rooms: z.array(propertyRoomSchema).max(30), amenityIds: z.array(z.string().max(80)).min(1).max(50),
  photos: z.array(z.object({ id: z.string().min(1).max(160), url: z.string().min(1).max(2048), name: z.string().max(180), size: z.number().int().min(0).max(10 * 1024 * 1024), isCover: z.boolean(), category: listingPhotoCategorySchema.optional() })).min(minListingPhotos).max(maxListingPhotos),
  title: z.string().min(1).max(50), highlights: z.array(z.string()).max(2), description: z.string().min(20).max(500), virtualTourUrl: virtualTourUrlSchema, listingVideoUrl: listingVideoUrlSchema,
  bookingType: z.enum(["stay", "package", "both"]).catch("stay"), bookingMode: z.enum(["request", "instant"]), pricingMode: z.enum(["simple", "packages"]), basePrice: moneyAmountSchema(), weekendPrice: moneyAmountSchema(), holidayPrice: moneyAmountSchema().catch(0), holidayDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(80).catch([]), seasonalRates: z.array(seasonalRateSchema).max(12).catch([]), weekendPremium: z.number().int().min(0).max(99),
  cleaningFee: moneyAmountSchema(), securityDeposit: moneyAmountSchema(), currency: z.string().min(3).max(8), cancellationPolicy: z.enum(["flexible", "moderate", "strict"]),
  discounts: z.object({ newListing: z.boolean(), lastMinute: z.boolean(), weekly: z.boolean(), monthly: z.boolean() }),
  safetyDisclosures: z.object({ exteriorCamera: z.boolean(), noiseMonitor: z.boolean(), weapons: z.boolean() }),
  residentialAddress: z.object({ unit: z.string().max(80), building: z.string().max(120), street: z.string().min(3).max(160), barangay: z.string().min(1).max(80), city: z.string().min(1).max(80), zipCode: z.string().min(3).max(16), province: z.string().min(1).max(80) }),
  hostAsBusiness: z.boolean(),
  status: z.enum(["draft", "pending", "published"]),
  bookingPackages: z.array(bookingPackageSchema).max(8),
}).refine((value) => value.pricingMode !== "simple" || value.basePrice > 0, {
  message: "Set a weekday base price.",
  path: ["basePrice"],
}).refine((value) => value.pricingMode !== "simple" || value.weekendPrice > 0, {
  message: "Set a weekend price.",
  path: ["weekendPrice"],
}).refine((value) => value.pricingMode === "simple" || value.bookingPackages.some((item) => item.enabled && item.status !== "inactive"), {
  message: "Add at least one enabled booking package.",
  path: ["bookingPackages"],
}).refine((value) => value.privacyType === "entire" || (value.bookingType === "stay" && value.pricingMode === "simple"), {
  message: "Booking packages are only available for entire-place listings.",
  path: ["privacyType"],
}).refine((value) => value.bookingType !== "package" || value.pricingMode === "packages", {
  message: "Package-only listings need booking packages.",
  path: ["pricingMode"],
}).refine((value) => value.bookingType === "stay" || value.bookingPackages.some((item) => item.enabled && item.status !== "inactive"), {
  message: "Add at least one enabled package for package booking.",
  path: ["bookingPackages"],
});
export type HostListingInput = z.infer<typeof hostListingSchema>;
