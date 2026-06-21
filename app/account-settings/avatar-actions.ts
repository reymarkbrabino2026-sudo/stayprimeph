"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { assertValidCsrfForm } from "@/lib/csrf";
import { env } from "@/lib/env";
import { updateUserAvatarInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { isIntendedAvatarUrl } from "@/lib/upload-paths";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";

export async function updateAvatar(formData: FormData): Promise<{ success?: true; error?: string }> {
  try {
    await assertTrustedRequestOrigin();
    await assertValidCsrfForm(formData);

    const user = await getCurrentUser();
    if (!user) return { error: "Please sign in first." };

    const url = String(formData.get("avatarUrl") ?? "").trim();
    if (!isIntendedAvatarUrl(url, { userId: user.id, cloudName: env.CLOUDINARY_CLOUD_NAME })) {
      return { error: "Profile photos must be uploaded through StayPrime before saving." };
    }

    if (usesPrismaPersistence()) {
      await updateUserAvatarInDatabase(user.id, url);
    } else {
      const users = await readStoredUsers();
      await writeStoredUsers(users.map((stored) => (stored.id === user.id ? { ...stored, avatar: url } : stored)));
    }

    revalidatePath("/host/profile");
    revalidatePath("/guest/profile");
    revalidatePath("/account-settings");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update your profile photo." };
  }
}
