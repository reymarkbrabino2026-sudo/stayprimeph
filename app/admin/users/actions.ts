"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { processAccountDeletion } from "@/lib/account-deletion";
import { assertValidCsrfToken } from "@/lib/csrf";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import type { AccountActionResult } from "@/lib/account-settings-types";

export async function processAccountDeletionAction(userId: string, csrfToken?: string): Promise<AccountActionResult<{ message: string }>> {
  try {
    await assertTrustedRequestOrigin();
    await assertValidCsrfToken(csrfToken);

    const admin = await requireRole("admin", { forbiddenMessage: "Only admins can process account deletion." });

    await processAccountDeletion({ adminId: admin.id, targetUserId: userId });
    revalidatePath("/admin/users");
    revalidatePath("/admin/hosts");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/listings");
    return { ok: true, data: { message: "Account anonymized and login disabled." } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error && error.message ? error.message : "Could not process account deletion.",
    };
  }
}
