export type WizardStepId =
  | "address"
  | "place-intro"
  | "property-type"
  | "privacy-type"
  | "location"
  | "visibility"
  | "basics"
  | "standout-intro"
  | "amenities"
  | "photos"
  | "highlights"
  | "title"
  | "description"
  | "finish-intro"
  | "booking"
  | "pricing"
  | "weekend-pricing"
  | "discounts"
  | "safety"
  | "final-details"
  | "review"
  | "publish";

export type ListingDraftStatus = "draft" | "pending" | "published";

export interface WizardOption { id: string; label: string; description?: string; icon: string; }
export interface AmenityGroup { id: string; title: string; items: WizardOption[]; }
export interface UploadedPhoto { id: string; url: string; name: string; size: number; isCover: boolean; }

export interface HostListingDraft {
  country: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  locationPinned: boolean;
  lastAutoGeocodeAddress: string;
  propertyType: string;
  privacyType: string;
  preciseLocation: boolean;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenityIds: string[];
  photos: UploadedPhoto[];
  title: string;
  highlights: string[];
  description: string;
  bookingMode: "request" | "instant";
  basePrice: number;
  weekendPrice: number;
  weekendPremium: number;
  cleaningFee: number;
  securityDeposit: number;
  currency: string;
  cancellationPolicy: "flexible" | "moderate" | "strict";
  discounts: { newListing: boolean; lastMinute: boolean; weekly: boolean; monthly: boolean };
  safetyDisclosures: { exteriorCamera: boolean; noiseMonitor: boolean; weapons: boolean };
  residentialAddress: { unit: string; building: string; street: string; barangay: string; city: string; zipCode: string; province: string };
  hostAsBusiness: boolean | null;
  status: ListingDraftStatus;
}

export interface WizardStepDefinition { id: WizardStepId; title: string; eyebrow?: string; description?: string; }
