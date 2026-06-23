import type { PublicListingSummary } from "@/lib/types";

export interface PropertyRail {
  title: string;
  items: PublicListingSummary[];
}

const cityRailTitle = (city: string, index: number) => {
  if (index === 0) return `Popular homes in ${city}`;
  if (index === 1) return `Available next month in ${city}`;
  return `Stay in ${city}`;
};

export function buildHomePropertyRails(properties: PublicListingSummary[]): PropertyRail[] {
  const byCity = new Map<string, PublicListingSummary[]>();

  for (const property of properties) {
    const cityProperties = byCity.get(property.city) ?? [];
    cityProperties.push(property);
    byCity.set(property.city, cityProperties);
  }

  const cityRails = [...byCity.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([city, items], index) => ({ title: cityRailTitle(city, index), items }));

  const newest = [...properties]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return newest.length > 0 ? [...cityRails, { title: "New and notable stays", items: newest }] : [];
}
