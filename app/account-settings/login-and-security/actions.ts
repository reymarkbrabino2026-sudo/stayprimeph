"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAllSessionsForUserExceptCurrent,
  clearSession,
  getCurrentAuthSession,
  requireUser,
  revokeSessionForUser,
} from "@/lib/auth";
import { assertValidCsrfForm } from "@/lib/csrf";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";

export async function revokeAccountSession(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const user = await requireUser({ redirectTo: "/login" });
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) throw new Error("Session is required.");

  const currentSession = await getCurrentAuthSession();
  await revokeSessionForUser(user.id, sessionId);

  if (currentSession?.id === sessionId) {
    await clearSession();
    redirect(`/login?message=${encodeURIComponent("This device has been logged out.")}`);
  }

  revalidatePath("/account-settings/login-and-security");
}

export async function revokeOtherAccountSessions(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const user = await requireUser({ redirectTo: "/login" });
  await clearAllSessionsForUserExceptCurrent(user.id);
  revalidatePath("/account-settings/login-and-security");
}
