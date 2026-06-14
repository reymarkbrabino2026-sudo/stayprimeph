import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { Cancellation } from "@/lib/types";

const storeFileName = "cancellations.json";

export async function readStoredCancellations(): Promise<Cancellation[]> {
  return readJsonStore<Cancellation>(storeFileName);
}

export async function writeStoredCancellations(cancellations: Cancellation[]) {
  await writeJsonStore(storeFileName, cancellations);
}
