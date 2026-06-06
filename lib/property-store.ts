import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { Property } from "@/lib/types";

const storeFileName = "properties.json";

export async function readStoredProperties(): Promise<Property[]> {
  return readJsonStore<Property>(storeFileName);
}

export async function writeStoredProperties(properties: Property[]) {
  await writeJsonStore(storeFileName, properties);
}
