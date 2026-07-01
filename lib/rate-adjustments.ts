import "server-only";

import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { updatePropertyPricingRulesInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import type { ListingRateAdjustment, Property } from "@/lib/types";

export async function saveListingRateAdjustments(property: Property, rateAdjustments: ListingRateAdjustment[]) {
  const nextProperty = { ...property, rateAdjustments };

  if (usesPrismaPersistence()) {
    await updatePropertyPricingRulesInDatabase(nextProperty);
    return;
  }

  const storedProperties = await readStoredProperties();
  await writeStoredProperties(storedProperties.map((item) => (
    item.id === property.id ? nextProperty : item
  )));
}
