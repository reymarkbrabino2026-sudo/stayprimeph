"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearStoredHostWizardDraft } from "@/stores/host-wizard-store";

export function HostDraftCleaner({ enabled, userId }: { enabled: boolean; userId?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    clearStoredHostWizardDraft(userId);
    router.replace("/host/listings", { scroll: false });
  }, [enabled, router, userId]);

  return null;
}
