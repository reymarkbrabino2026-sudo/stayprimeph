import { z } from "zod";

const bookingPackageSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  accessType: z.string().min(1).max(120),
  unit: z.enum(["night", "day"]),
  weekdayRate: z.number().int().min(1).max(1000000),
  weekendRate: z.number().int().min(0).max(1000000),
  holidayRate: z.number().int().min(0).max(1000000),
  includedGuests: z.number().int().min(1).max(500),
  maxGuests: z.number().int().min(1).max(500),
  additionalGuestFee: z.number().int().min(0).max(1000000),
  extensionHourlyFee: z.number().int().min(0).max(1000000),
  checkInTime: z.string().min(1).max(40),
  checkOutTime: z.string().min(1).max(40),
  enabled: z.boolean(),
}).refine((value) => value.maxGuests >= value.includedGuests, {
  message: "Maximum guests must be greater than or equal to included guests.",
  path: ["maxGuests"],
});

export const hostListingSchema = z.object({
  uploadScopeId: z.string().min(1).max(120),
  country: z.string().min(1).max(80), street: z.string().min(3).max(160), barangay: z.string().min(1).max(80), city: z.string().min(1).max(80), province: z.string().min(1).max(80), zipCode: z.string().min(3).max(16),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), locationConfirmed: z.literal(true), locationConfirmedAddress: z.string().min(1).max(600), propertyType: z.string().min(1).max(80), privacyType: z.string().min(1).max(80), preciseLocation: z.boolean(),
  guests: z.number().int().min(1).max(50), bedrooms: z.number().int().min(0).max(50), beds: z.number().int().min(1).max(100), bathrooms: z.number().min(1).max(50), amenityIds: z.array(z.string().max(80)).min(1).max(50),
  photos: z.array(z.object({ id: z.string().min(1).max(160), url: z.string().min(1).max(2048), name: z.string().max(180), size: z.number().int().min(0).max(10 * 1024 * 1024), isCover: z.boolean() })).min(5).max(20),
  title: z.string().min(1).max(50), highlights: z.array(z.string()).max(2), description: z.string().min(20).max(500),
  bookingMode: z.enum(["request", "instant"]), pricingMode: z.enum(["simple", "packages"]), basePrice: z.number().int().min(1).max(1000000), weekendPrice: z.number().int().min(1).max(1000000), weekendPremium: z.number().int().min(0).max(99),
  cleaningFee: z.number().int().min(0).max(1000000), securityDeposit: z.number().int().min(0).max(1000000), currency: z.string().min(3).max(8), cancellationPolicy: z.enum(["flexible", "moderate", "strict"]),
  discounts: z.object({ newListing: z.boolean(), lastMinute: z.boolean(), weekly: z.boolean(), monthly: z.boolean() }),
  safetyDisclosures: z.object({ exteriorCamera: z.boolean(), noiseMonitor: z.boolean(), weapons: z.boolean() }),
  residentialAddress: z.object({ unit: z.string().max(80), building: z.string().max(120), street: z.string().min(3).max(160), barangay: z.string().min(1).max(80), city: z.string().min(1).max(80), zipCode: z.string().min(3).max(16), province: z.string().min(1).max(80) }),
  hostAsBusiness: z.boolean(),
  status: z.enum(["draft", "pending", "published"]),
  bookingPackages: z.array(bookingPackageSchema).max(8),
}).refine((value) => value.pricingMode === "simple" || value.bookingPackages.some((item) => item.enabled), {
  message: "Add at least one enabled booking package.",
  path: ["bookingPackages"],
});
export type HostListingInput = z.infer<typeof hostListingSchema>;
