import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { AvailabilityBlock } from "@/lib/types";

const storeFileName = "availability-blocks.json";

export async function readStoredAvailabilityBlocks(): Promise<AvailabilityBlock[]> {
  return readJsonStore<AvailabilityBlock>(storeFileName);
}

export async function writeStoredAvailabilityBlocks(blocks: AvailabilityBlock[]) {
  await writeJsonStore(storeFileName, blocks);
}
