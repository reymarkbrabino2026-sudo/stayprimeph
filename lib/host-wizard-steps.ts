import { hostWizardSteps } from "@/lib/host-wizard-data";
import type { HostListingDraft, WizardStepDefinition, WizardStepId } from "@/lib/host-wizard-types";

export function isEntirePlacePrivacyType(privacyType?: string) {
  return privacyType === "entire";
}

export function hostWizardStepAppliesToDraft(stepId: WizardStepId, draft: Pick<HostListingDraft, "privacyType">) {
  return (stepId !== "rooms" && stepId !== "booking-packages") || isEntirePlacePrivacyType(draft.privacyType);
}

export function activeHostWizardSteps(draft: Pick<HostListingDraft, "privacyType">) {
  return hostWizardSteps.filter((step) => hostWizardStepAppliesToDraft(step.id, draft));
}

export function findAdjacentApplicableHostWizardStep(
  currentStep: WizardStepId,
  draft: Pick<HostListingDraft, "privacyType">,
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
