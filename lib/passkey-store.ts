import type { Passkey } from "@/lib/types";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";

const storeFileName = "passkeys.json";

export async function readStoredPasskeys(): Promise<Passkey[]> {
  return readJsonStore<Passkey>(storeFileName);
}

export async function writeStoredPasskeys(passkeys: Passkey[]) {
  await writeJsonStore(storeFileName, passkeys);
}
