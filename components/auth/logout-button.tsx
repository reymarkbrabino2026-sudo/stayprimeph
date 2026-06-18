"use client";

import { signOut } from "@/app/auth/actions";
import { clearStoredHostWizardDraft } from "@/stores/host-wizard-store";

export function clearClientSessionState() {
  if (typeof window === "undefined") return;

  clearStoredHostWizardDraft();
  window.sessionStorage.clear();
}

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={signOut} onSubmit={clearClientSessionState}>
      <button className={className ?? "min-h-12 w-full rounded-2xl border px-5 py-3 font-semibold sm:w-auto"}>
        Log out
      </button>
    </form>
  );
}
