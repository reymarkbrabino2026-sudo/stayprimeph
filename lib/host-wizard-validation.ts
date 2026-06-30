import { hostListingAddressSchema } from "@/lib/host-wizard-schema";
import { maxListingPhotos, minListingPhotos } from "@/lib/host-wizard-limits";
import { isValidListingVideoUrl } from "@/lib/listing-video";
import type { HostBookingPackageDraft, HostListingDraft, WizardStepDefinition, WizardStepId } from "@/lib/host-wizard-types";
import { activeHostWizardSteps, isEntirePlacePrivacyType } from "@/lib/host-wizard-steps";
import { isValidVirtualTourUrl } from "@/lib/virtual-tour";

export type HostWizardStepRequirement = {
  step: WizardStepDefinition;
  messages: string[];
};

const addressFieldLabels: Array<[keyof Pick<HostListingDraft, "country" | "street" | "barangay" | "city" | "province" | "zipCode">, string]> = [
  ["country", "country"],
  ["street", "street address"],
  ["barangay", "barangay"],
  ["city", "city"],
  ["province", "province"],
  ["zipCode", "ZIP code"],
];

const residentialAddressFieldLabels: Array<[keyof HostListingDraft["residentialAddress"], string, number]> = [
  ["street", "street address", 3],
  ["barangay", "barangay", 1],
  ["city", "city", 1],
  ["zipCode", "ZIP code", 3],
  ["province", "province", 1],
];

function formatDraftAddress(draft: HostListingDraft) {
  return [draft.street, draft.barangay, draft.city, draft.province, draft.country, draft.zipCode]
    .filter(Boolean)
    .join(", ");
}

function hasConfirmedListingPin(draft: HostListingDraft) {
  return (
    draft.locationPinned &&
    draft.locationConfirmed &&
    draft.locationConfirmedAddress === formatDraftAddress(draft) &&
    Number.isFinite(draft.latitude) &&
    Number.isFinite(draft.longitude)
  );
}

function compactList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function describePackageIssues(pkg: HostBookingPackageDraft) {
  const fields: string[] = [];

  if (!pkg.name.trim()) fields.push("package name");
  if (!pkg.accessType.trim()) fields.push("guest access");
  if (pkg.weekdayRate < 1) fields.push("weekday rate");
  if (pkg.includedGuests < 1) fields.push("included guests");
  if (pkg.maxGuests < 1) fields.push("maximum guests");
  if (pkg.maxGuests < pkg.includedGuests) fields.push("maximum guests");
  if (pkg.durationHours < 1) fields.push("length in hours");
  if (!pkg.availableDays.length) fields.push("available days");

  return Array.from(new Set(fields));
}

export function getMissingRequirementsForStep(step: WizardStepId, draft: HostListingDraft): string[] {
  switch (step) {
    case "address": {
      const missing = addressFieldLabels
        .filter(([key]) => !String(draft[key] ?? "").trim())
        .map(([, label]) => label);

      if (missing.length) return [`Complete the listing address: ${compactList(missing)}.`];
      if (!hostListingAddressSchema.safeParse({
        country: draft.country,
        street: draft.street,
        barangay: draft.barangay,
        city: draft.city,
        province: draft.province,
        zipCode: draft.zipCode,
      }).success) {
        return ["Check the listing address. Street address and ZIP code need to be complete."];
      }

      return [];
    }

    case "location":
    case "visibility":
      if (hasConfirmedListingPin(draft)) return [];
      if (!draft.locationPinned) return ["Place the map pin and confirm the location."];
      if (!draft.locationConfirmed) return ["Confirm the map pin for this address."];
      return ["Confirm the map pin again after changing the address."];

    case "property-type":
      return draft.propertyType ? [] : ["Choose a property type."];

    case "privacy-type":
      return draft.privacyType ? [] : ["Choose what type of place guests will have."];

    case "basics": {
      const missing = [
        draft.guests < 1 ? "at least 1 guest" : "",
        draft.beds < 1 ? "at least 1 bed" : "",
        draft.bathrooms < 1 ? "at least 1 bathroom" : "",
      ].filter(Boolean);

      return missing.length ? [`Set ${compactList(missing)}.`] : [];
    }

    case "rooms": {
      if (!isEntirePlacePrivacyType(draft.privacyType) || draft.rooms.length === 0) return [];

      const invalidRooms = draft.rooms.filter((room) => !room.name.trim() || !room.floor.trim() || room.capacity < 1);
      if (!invalidRooms.length) return [];

      return [`Complete or remove ${pluralize(invalidRooms.length, "room")} with missing name, floor, or capacity.`];
    }

    case "amenities":
      return draft.amenityIds.length > 0 ? [] : ["Choose at least one amenity."];

    case "photos": {
      if (!isValidListingVideoUrl(draft.listingVideoUrl)) return ["Paste a valid YouTube or Vimeo video link, or leave it blank."];
      if (draft.photos.length > maxListingPhotos) return [`Keep listing photos to ${maxListingPhotos} or fewer.`];
      const remaining = Math.max(0, minListingPhotos - draft.photos.length);
      return remaining === 0 ? [] : [`Upload ${pluralize(remaining, "more photo", "more photos")}.`];
    }

    case "highlights":
      return draft.highlights.length > 0 ? [] : ["Choose at least one highlight."];

    case "title":
      if (!draft.title.trim()) return ["Add a listing title."];
      if (draft.title.length > 50) return ["Keep the listing title to 50 characters or less."];
      return [];

    case "description":
      if (draft.description.trim().length < 20) return ["Write at least 20 characters in the description."];
      if (draft.description.length > 500) return ["Keep the description to 500 characters or less."];
      return [];

    case "virtual-tour":
      return isValidVirtualTourUrl(draft.virtualTourUrl) ? [] : ["Use a valid virtual tour link, or leave the field blank."];

    case "booking": {
      const missing = [
        draft.bookingType ? "" : "what guests can book",
        draft.bookingMode ? "" : "how reservations are confirmed",
      ].filter(Boolean);

      return missing.length ? [`Choose ${compactList(missing)}.`] : [];
    }

    case "pricing":
      return draft.basePrice > 0 ? [] : ["Set a weekday base price."];

    case "weekend-pricing":
      return draft.weekendPrice > 0 ? [] : ["Set a weekend price."];

    case "booking-packages": {
      if (!isEntirePlacePrivacyType(draft.privacyType) || draft.pricingMode !== "packages") return [];

      const enabledPackages = draft.bookingPackages.filter((item) => item.enabled && item.status !== "inactive");
      if (!enabledPackages.length) return ["Turn on at least one booking package."];

      const invalidPackage = enabledPackages.find((item) => describePackageIssues(item).length > 0);
      if (!invalidPackage) return [];

      const packageName = invalidPackage.name.trim() || "Enabled package";
      return [`Complete ${packageName}: ${compactList(describePackageIssues(invalidPackage))}.`];
    }

    case "final-details": {
      const missing = residentialAddressFieldLabels
        .filter(([key, , minLength]) => String(draft.residentialAddress[key] ?? "").trim().length < minLength)
        .map(([, label]) => label);

      if (draft.hostAsBusiness === null) missing.push("hosting as a business");
      return missing.length ? [`Complete final details: ${compactList(missing)}.`] : [];
    }

    default:
      return [];
  }
}

export function canAdvanceFromStep(step: WizardStepId, draft: HostListingDraft) {
  return getMissingRequirementsForStep(step, draft).length === 0;
}

export function getIncompleteHostWizardSteps(draft: HostListingDraft): HostWizardStepRequirement[] {
  return activeHostWizardSteps(draft)
    .map((step) => ({ step, messages: getMissingRequirementsForStep(step.id, draft) }))
    .filter((requirement) => requirement.messages.length > 0);
}

export function getFirstIncompleteHostWizardStep(draft: HostListingDraft) {
  return getIncompleteHostWizardSteps(draft)[0] ?? null;
}
