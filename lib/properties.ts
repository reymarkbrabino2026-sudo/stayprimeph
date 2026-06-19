import { findPropertyByIdFromDatabase, listPropertiesFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredProperties } from "@/lib/property-store";

export async function getProperties() {
  if (usesPrismaPersistence()) return listPropertiesFromDatabase();
  return readStoredProperties();
}

export async function getPropertyById(id: string) {
  if (usesPrismaPersistence()) return findPropertyByIdFromDatabase(id);
  const properties = await getProperties();
  return properties.find((property) => property.id === id) ?? null;
}
