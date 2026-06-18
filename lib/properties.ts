import { enforceDataRetentionOncePerDay } from "@/lib/data-retention";
import { listPropertiesFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredProperties } from "@/lib/property-store";

export async function getProperties() {
  await enforceDataRetentionOncePerDay();
  if (usesPrismaPersistence()) return listPropertiesFromDatabase();
  return readStoredProperties();
}

export async function getPropertyById(id: string) {
  const properties = await getProperties();
  return properties.find((property) => property.id === id) ?? null;
}
