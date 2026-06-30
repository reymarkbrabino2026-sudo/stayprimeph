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

const maxMoneyValue = 1000000;

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

function numberIssue(label: string, value: number, min: number, max: number, integer = true) {
  if (typeof value !== "number" || !Number.isFinite(value)) return `${label} must be a number.`;
  if (integer && !Number.isInteger(value)) return `${label} must be a whole number.`;
  if (value < min) return `${label} must be at least ${min}.`;
  if (value > max) return `${label} must be ${max.toLocaleString("en-PH")} or less.`;
  return null;
}

function hasAtMostTwoDecimalPlaces(value: number) {
  return Math.abs(value * 100 - Math.round(value * 100)) < Number.EPSILON * 100;
}

function moneyIssue(label: string, value: number, min: number, max: number) {
  const issue = numberIssue(label, value, min, max, false);
  if (issue) return issue;
  if (!hasAtMostTwoDecimalPlaces(value)) return `${label} can use up to 2 decimal places.`;
  return null;
}

function textIssue(label: string, value: string, min: number, max: number) {
  const length = value.trim().length;
  if (length < min) return min > 0 ? `${label} is required.` : null;
  if (value.length > max) return `${label} must be ${max} characters or less.`;
  return null;
}

function listIssue(label: string, values: string[], maxItems: number, maxCharacters: number) {
  if (values.length > maxItems) return `${label} can have up to ${maxItems} items.`;
  if (values.some((value) => !value.trim())) return `${label} cannot include blank items.`;
  if (values.some((value) => value.length > maxCharacters)) return `${label} items must be ${maxCharacters} characters or less.`;
  return null;
}

function dateListIssue(label: string, values: string[], maxItems = 80) {
  if (values.length > maxItems) return `${label} can have up to ${maxItems} dates.`;
  if (values.some((value) => !/^\d{4}-\d{2}-\d{2}$/.test(value))) return `${label} must use YYYY-MM-DD dates.`;
  return null;
}

function describeSeasonalRateIssues(label: string, rates: HostListingDraft["seasonalRates"]) {
  const issues: string[] = [];
  if (rates.length > 12) issues.push(`${label} can have up to 12 rows.`);

  rates.forEach((rate, index) => {
    const prefix = `${label} row ${index + 1}`;
    const nameIssue = textIssue(`${prefix} name`, rate.name, 1, 80);
    if (nameIssue) issues.push(nameIssue);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rate.startDate)) issues.push(`${prefix} start date must use YYYY-MM-DD.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rate.endDate)) issues.push(`${prefix} end date must use YYYY-MM-DD.`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(rate.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(rate.endDate) && rate.endDate < rate.startDate) {
      issues.push(`${prefix} end date must be after the start date.`);
    }

    [
      ["weekday rate", rate.weekdayRate],
      ["weekend rate", rate.weekendRate],
      ["holiday rate", rate.holidayRate],
    ].forEach(([fieldLabel, value]) => {
      const issue = moneyIssue(`${prefix} ${fieldLabel}`, value as number, 0, maxMoneyValue);
      if (issue) issues.push(issue);
    });
  });

  return issues;
}

function isValidWholeNumber(value: number, min: number, max: number) {
  return !numberIssue("", value, min, max);
}

function isValidMoneyValue(value: number, min: number, max: number) {
  return !moneyIssue("", value, min, max);
}

function describeRoomIssues(room: HostListingDraft["rooms"][number], index: number) {
  const prefix = `Room ${index + 1}`;
  const issues = [
    textIssue(`${prefix} name`, room.name, 1, 80),
    numberIssue(`${prefix} capacity`, room.capacity, 1, 100),
    textIssue(`${prefix} floor`, room.floor, 1, 80),
    textIssue(`${prefix} description`, room.description, 0, 300),
    room.photos.length > 12 ? `${prefix} can have up to 12 room photos.` : null,
    listIssue(`${prefix} amenities`, room.amenities, 30, 80),
  ].filter((issue): issue is string => Boolean(issue));

  return issues;
}

function describePackageIssues(pkg: HostBookingPackageDraft, index: number) {
  const prefix = `Package ${index + 1}`;
  const isBookable = pkg.enabled && pkg.status !== "inactive";
  const issues: string[] = [];

  [
    textIssue(`${prefix} name`, pkg.name, 1, 80),
    textIssue(`${prefix} description`, pkg.description, 0, 300),
    textIssue(`${prefix} guest access`, pkg.accessType, 1, 120),
    pkg.status === "active" || pkg.status === "inactive" ? null : `${prefix} status is invalid.`,
    pkg.unit === "night" || pkg.unit === "day" ? null : `${prefix} count type is invalid.`,
    numberIssue(`${prefix} display order`, pkg.displayOrder, 0, 100),
    moneyIssue(`${prefix} weekday rate`, pkg.weekdayRate, 0, maxMoneyValue),
    moneyIssue(`${prefix} weekend rate`, pkg.weekendRate, 0, maxMoneyValue),
    moneyIssue(`${prefix} holiday rate`, pkg.holidayRate, 0, maxMoneyValue),
    numberIssue(`${prefix} included guests`, pkg.includedGuests, 0, 500),
    numberIssue(`${prefix} maximum guests`, pkg.maxGuests, 0, 500),
    numberIssue(`${prefix} sleeping capacity`, pkg.sleepingCapacity, 0, 500),
    numberIssue(`${prefix} length in hours`, pkg.durationHours, 0, 168),
    moneyIssue(`${prefix} extra guest fee`, pkg.additionalGuestFee, 0, maxMoneyValue),
    moneyIssue(`${prefix} extension hourly fee`, pkg.extensionHourlyFee, 0, maxMoneyValue),
    numberIssue(`${prefix} advance notice`, pkg.minimumAdvanceBookingDays, 0, 365),
    textIssue(`${prefix} start / check-in`, pkg.checkInTime, 1, 40),
    textIssue(`${prefix} end / check-out`, pkg.checkOutTime, 1, 40),
    listIssue(`${prefix} areas`, pkg.accessibleFloors, 20, 80),
    listIssue(`${prefix} rooms`, pkg.accessibleRoomIds, 50, 100),
    listIssue(`${prefix} included amenities`, pkg.includedAmenities, 80, 80),
    listIssue(`${prefix} not included`, pkg.excludedAmenities, 80, 80),
    listIssue(`${prefix} blocked packages`, pkg.blockedPackageIds, 20, 100),
    dateListIssue(`${prefix} holiday dates`, pkg.holidayDates ?? []),
    ...describeSeasonalRateIssues(`${prefix} seasonal rates`, pkg.seasonalRates ?? []),
  ].filter((issue): issue is string => Boolean(issue)).forEach((issue) => issues.push(issue));

  if (pkg.availableDays.length > 7 || pkg.availableDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    issues.push(`${prefix} available days are invalid.`);
  }

  if (!isBookable) return issues;

  if (isValidMoneyValue(pkg.weekdayRate, 0, maxMoneyValue) && pkg.weekdayRate < 1) issues.push(`${prefix} weekday rate must be at least 1.`);
  if (isValidWholeNumber(pkg.includedGuests, 0, 500) && pkg.includedGuests < 1) issues.push(`${prefix} included guests must be at least 1.`);
  if (isValidWholeNumber(pkg.maxGuests, 0, 500) && pkg.maxGuests < 1) issues.push(`${prefix} maximum guests must be at least 1.`);
  if (
    isValidWholeNumber(pkg.includedGuests, 0, 500) &&
    isValidWholeNumber(pkg.maxGuests, 0, 500) &&
    pkg.maxGuests < pkg.includedGuests
  ) {
    issues.push(`${prefix} maximum guests must be greater than or equal to included guests.`);
  }
  if (isValidWholeNumber(pkg.durationHours, 0, 168) && pkg.durationHours < 1) issues.push(`${prefix} length in hours must be at least 1.`);
  if (!pkg.availableDays.length) issues.push(`${prefix} available days are required.`);

  return Array.from(new Set(issues));
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
        numberIssue("Guest count", draft.guests, 1, 50),
        numberIssue("Bedrooms", draft.bedrooms, 0, 50),
        numberIssue("Beds", draft.beds, 1, 100),
        numberIssue("Bathrooms", draft.bathrooms, 1, 50, false),
      ].filter(Boolean);

      return missing as string[];
    }

    case "rooms": {
      if (!isEntirePlacePrivacyType(draft.privacyType) || draft.rooms.length === 0) return [];

      return draft.rooms.flatMap((room, index) => describeRoomIssues(room, index));
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

    case "pricing": {
      const basePriceIssue = moneyIssue("Weekday base price", draft.basePrice, 1, maxMoneyValue);
      const holidayPriceIssue = moneyIssue("Holiday nightly rate", draft.holidayPrice, 0, maxMoneyValue);
      return [basePriceIssue, holidayPriceIssue, ...describeSeasonalRateIssues("Seasonal rates", draft.seasonalRates)].filter((issue): issue is string => Boolean(issue));
    }

    case "weekend-pricing": {
      const weekendPriceIssue = moneyIssue("Weekend price", draft.weekendPrice, 1, maxMoneyValue);
      return weekendPriceIssue ? [weekendPriceIssue] : [];
    }

    case "booking-packages": {
      if (!isEntirePlacePrivacyType(draft.privacyType) || draft.pricingMode !== "packages") return [];

      const enabledPackages = draft.bookingPackages.filter((item) => item.enabled && item.status !== "inactive");
      if (!enabledPackages.length) return ["Turn on at least one booking package."];

      return draft.bookingPackages.flatMap((item, index) => describePackageIssues(item, index));
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
