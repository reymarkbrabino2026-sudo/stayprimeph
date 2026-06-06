import type { Property } from "@/lib/types";

export interface PropertyRail {
  title: string;
  items: Property[];
}

export function buildHomePropertyRails(properties: Property[]): PropertyRail[] {
  const approved = properties.filter((property) => property.status === "approved");
  const byCity = new Map<string, Property[]>();

  for (const property of approved) {
    const cityProperties = byCity.get(property.city) ?? [];
    cityProperties.push(property);
    byCity.set(property.city, cityProperties);
  }

  const cityRails = [...byCity.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([city, items]) => ({ title: `Homes in ${city}`, items }));

  const newest = [...approved]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return newest.length > 0 ? [{ title: "New and notable stays", items: newest }, ...cityRails] : [];
}
