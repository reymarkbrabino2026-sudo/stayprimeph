"use server";

import { redirect } from "next/navigation";
import { appendAuditLog } from "@/lib/audit-logs";
import { clearAllSessionsForUser, clearSession, requireUser, requireVerifiedEmail } from "@/lib/auth";
import { assertValidCsrfForm } from "@/lib/csrf";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { updateUserRoleInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";

export async function continueAsHost(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const user = await requireUser({ redirectTo: "/register?role=host" });

  requireVerifiedEmail(user);
  if (user.role === "host") redirect("/become-a-host/setup");
  if (user.role !== "guest") redirect("/login?role=host");

  if (usesPrismaPersistence()) {
    await updateUserRoleInDatabase(user.id, "host");
  } else {
    const users = await readStoredUsers();
    await writeStoredUsers(users.map((item) => (item.id === user.id ? { ...item, role: "host" } : item)));
    await clearAllSessionsForUser(user.id);
  }

  await appendAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: "account.role_changed",
    entityType: "user",
    entityId: user.id,
    metadata: {
      previousRole: user.role,
      nextRole: "host",
      sessionsRevoked: true,
    },
  });

  await clearSession();
  redirect(`/login?role=host&message=${encodeURIComponent("Your host access was updated. Please log in again.")}`);
}
