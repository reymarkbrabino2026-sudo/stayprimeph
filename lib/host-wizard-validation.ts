import type { HostListingDraft, WizardStepId } from "@/lib/host-wizard-types";
export function canAdvanceFromStep(step: WizardStepId, draft: HostListingDraft) {
  switch (step) {
    case "address": return Boolean(draft.country && draft.street && draft.barangay && draft.city && draft.province && draft.zipCode);
    case "property-type": return Boolean(draft.propertyType);
    case "privacy-type": return Boolean(draft.privacyType);
    case "basics": return draft.guests >= 1 && draft.beds >= 1 && draft.bathrooms >= 1;
    case "amenities": return draft.amenityIds.length > 0;
    case "photos": return draft.photos.length >= 5;
    case "highlights": return draft.highlights.length > 0;
    case "title": return draft.title.trim().length > 0 && draft.title.length <= 50;
    case "description": return draft.description.trim().length >= 20 && draft.description.length <= 500;
    case "pricing": return draft.basePrice > 0;
    case "weekend-pricing": return draft.weekendPrice > 0;
    case "final-details": return Boolean(draft.residentialAddress.street && draft.residentialAddress.barangay && draft.residentialAddress.city && draft.residentialAddress.zipCode && draft.residentialAddress.province && draft.hostAsBusiness !== null);
    default: return true;
  }
}
