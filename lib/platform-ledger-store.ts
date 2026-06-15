import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { PlatformLedgerEntry } from "@/lib/types";

const storeFileName = "platform-ledger.json";

export async function readStoredPlatformLedger(): Promise<PlatformLedgerEntry[]> {
  return readJsonStore<PlatformLedgerEntry>(storeFileName);
}

export async function writeStoredPlatformLedger(entries: PlatformLedgerEntry[]) {
  await writeJsonStore(storeFileName, entries);
}
