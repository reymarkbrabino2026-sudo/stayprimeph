import { listUsersFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredUsers } from "@/lib/user-store";

export async function getUsers() {
  if (usesPrismaPersistence()) return listUsersFromDatabase();
  return readStoredUsers();
}

export async function getUserById(id: string) {
  const users = await getUsers();
  return users.find((user) => user.id === id) ?? null;
}
