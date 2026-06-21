import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { Payout } from "@/lib/types";

const storeFileName = "payouts.json";

export async function readStoredPayouts(): Promise<Payout[]> {
  return readJsonStore<Payout>(storeFileName);
}

export async function writeStoredPayouts(payouts: Payout[]) {
  await writeJsonStore(storeFileName, payouts);
}
