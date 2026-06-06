import { PropertyCard } from "@/components/listings/property-card";
import type { Property } from "@/lib/types";

export function PropertyGrid({ properties }: { properties: Property[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
