import "server-only";

import { readStoredAvailabilityBlocks, writeStoredAvailabilityBlocks } from "@/lib/availability-store";
import {
  createAvailabilityBlocksInDatabase,
  deleteAvailabilityBlockInDatabase,
  listAvailabilityBlocksFromDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import type { AvailabilityBlock as StoredAvailabilityBlock } from "@/lib/types";

export async function getAvailabilityBlocks() {
  if (usesPrismaPersistence()) return listAvailabilityBlocksFromDatabase();
  return readStoredAvailabilityBlocks();
}

export async function createAvailabilityBlocks(blocks: StoredAvailabilityBlock[]) {
  if (usesPrismaPersistence()) return createAvailabilityBlocksInDatabase(blocks);

  const stored = await readStoredAvailabilityBlocks();
  const incomingKeys = new Set(blocks.map((block) => `${block.propertyId}:${block.date}`));
  await writeStoredAvailabilityBlocks([...blocks, ...stored.filter((block) => !incomingKeys.has(`${block.propertyId}:${block.date}`))]);
}

export async function deleteAvailabilityBlock(blockId: string) {
  if (usesPrismaPersistence()) return deleteAvailabilityBlockInDatabase(blockId);

  const stored = await readStoredAvailabilityBlocks();
  await writeStoredAvailabilityBlocks(stored.filter((block) => block.id !== blockId));
}
