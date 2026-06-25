import { hostWizardSteps } from "@/lib/host-wizard-data";
import type { HostListingDraft, WizardStepDefinition, WizardStepId } from "@/lib/host-wizard-types";

export function isEntirePlacePrivacyType(privacyType?: string) {
  return privacyType === "entire";
}

export function hostWizardStepAppliesToDraft(stepId: WizardStepId, draft: Pick<HostListingDraft, "privacyType" | "pricingMode">) {
  if (stepId === "rooms") return isEntirePlacePrivacyType(draft.privacyType);
  if (stepId === "pricing") return draft.pricingMode === "simple";
  if (stepId === "weekend-pricing") return draft.pricingMode === "simple";
  if (stepId === "booking-packages") return isEntirePlacePrivacyType(draft.privacyType) && draft.pricingMode === "packages";

  return true;
}

export function activeHostWizardSteps(draft: Pick<HostListingDraft, "privacyType" | "pricingMode">) {
  return hostWizardSteps.filter((step) => hostWizardStepAppliesToDraft(step.id, draft));
}

export function findAdjacentApplicableHostWizardStep(
  currentStep: WizardStepId,
  draft: Pick<HostListingDraft, "privacyType" | "pricingMode">,
  direction: -1 | 1,
): WizardStepDefinition | null {
  const currentIndex = hostWizardSteps.findIndex((step) => step.id === currentStep);
  if (currentIndex < 0) return null;

  for (let index = currentIndex + direction; index >= 0 && index < hostWizardSteps.length; index += direction) {
    const step = hostWizardSteps[index];
    if (hostWizardStepAppliesToDraft(step.id, draft)) return step;
  }

  return null;
}
