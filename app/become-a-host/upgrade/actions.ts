"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { updateUserRoleInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";

export async function continueAsHost() {
  const user = await getCurrentUser();

  if (!user) redirect("/register?role=host");
  if (user.role === "host") redirect("/become-a-host/setup");
  if (user.role !== "guest") redirect("/login?role=host");

  if (usesPrismaPersistence()) {
    await updateUserRoleInDatabase(user.id, "host");
  } else {
    const users = await readStoredUsers();
    await writeStoredUsers(users.map((item) => (item.id === user.id ? { ...item, role: "host" } : item)));
  }

  redirect("/become-a-host/setup");
}
