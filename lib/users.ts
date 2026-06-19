import { findUserByIdFromDatabase, listUsersByIdsFromDatabase, listUsersFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredUsers } from "@/lib/user-store";

export async function getUsers() {
  if (usesPrismaPersistence()) return listUsersFromDatabase();
  return readStoredUsers();
}

export async function getUserById(id: string) {
  if (usesPrismaPersistence()) return findUserByIdFromDatabase(id);
  const users = await getUsers();
  return users.find((user) => user.id === id) ?? null;
}

export async function getUsersByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (!uniqueIds.length) return [];
  if (usesPrismaPersistence()) return listUsersByIdsFromDatabase(uniqueIds);
  const users = await getUsers();
  const idSet = new Set(uniqueIds);
  return users.filter((user) => idSet.has(user.id));
}
