import type { AuthSession } from "@/lib/types";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";

const storeFileName = "sessions.json";

export async function readStoredSessions(): Promise<AuthSession[]> {
  return readJsonStore<AuthSession>(storeFileName);
}

export async function writeStoredSessions(sessions: AuthSession[]) {
  await writeJsonStore(storeFileName, sessions);
}
