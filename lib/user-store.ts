import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { User } from "@/lib/types";

const storeFileName = "users.json";

export async function readStoredUsers(): Promise<User[]> {
  return readJsonStore<User>(storeFileName);
}

export async function writeStoredUsers(users: User[]) {
  await writeJsonStore(storeFileName, users);
}
