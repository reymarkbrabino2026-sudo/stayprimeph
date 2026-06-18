"use client";

import { useEffect } from "react";
import { clearStoredHostWizardDraft } from "@/stores/host-wizard-store";

export function HostDraftCleaner({ enabled, userId }: { enabled: boolean; userId?: string }) {
  useEffect(() => {
    if (!enabled) return;

    clearStoredHostWizardDraft(userId);
  }, [enabled, userId]);

  return null;
}
