import { z } from "zod";

export const hostListingSchema = z.object({
  country: z.string().min(1).max(80), street: z.string().min(3).max(160), barangay: z.string().min(1).max(80), city: z.string().min(1).max(80), province: z.string().min(1).max(80), zipCode: z.string().min(3).max(16),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), propertyType: z.string().min(1).max(80), privacyType: z.string().min(1).max(80), preciseLocation: z.boolean(),
  guests: z.number().int().min(1).max(50), bedrooms: z.number().int().min(0).max(50), beds: z.number().int().min(1).max(100), bathrooms: z.number().min(1).max(50), amenityIds: z.array(z.string().max(80)).min(1).max(50),
  photos: z.array(z.object({ id: z.string().min(1).max(160), url: z.string().min(1).max(2048), name: z.string().max(180), size: z.number().int().min(0).max(10 * 1024 * 1024), isCover: z.boolean() })).min(5).max(20),
  title: z.string().min(1).max(50), highlights: z.array(z.string()).max(2), description: z.string().min(20).max(500),
  bookingMode: z.enum(["request", "instant"]), basePrice: z.number().int().min(1).max(1000000), weekendPrice: z.number().int().min(1).max(1000000), weekendPremium: z.number().int().min(0).max(99),
  cleaningFee: z.number().int().min(0).max(1000000), securityDeposit: z.number().int().min(0).max(1000000), currency: z.string().min(3).max(8), cancellationPolicy: z.enum(["flexible", "moderate", "strict"]),
  discounts: z.object({ newListing: z.boolean(), lastMinute: z.boolean(), weekly: z.boolean(), monthly: z.boolean() }),
  safetyDisclosures: z.object({ exteriorCamera: z.boolean(), noiseMonitor: z.boolean(), weapons: z.boolean() }),
  residentialAddress: z.object({ unit: z.string().max(80), building: z.string().max(120), street: z.string().min(3).max(160), barangay: z.string().min(1).max(80), city: z.string().min(1).max(80), zipCode: z.string().min(3).max(16), province: z.string().min(1).max(80) }),
  hostAsBusiness: z.boolean(),
  status: z.enum(["draft", "pending", "published"]),
});
export type HostListingInput = z.infer<typeof hostListingSchema>;
