"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { processAccountDeletion } from "@/lib/account-deletion";
import type { AccountActionResult } from "@/lib/account-settings-types";

export async function processAccountDeletionAction(userId: string): Promise<AccountActionResult<{ message: string }>> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") throw new Error("Only admins can process account deletion.");

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
