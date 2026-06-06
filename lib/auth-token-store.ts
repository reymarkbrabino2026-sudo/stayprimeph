import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { AuthToken } from "@/lib/types";

const storeFileName = "auth-tokens.json";

export async function readStoredAuthTokens(): Promise<AuthToken[]> {
  return readJsonStore<AuthToken>(storeFileName);
}

export async function writeStoredAuthTokens(tokens: AuthToken[]) {
  await writeJsonStore(storeFileName, tokens);
}
