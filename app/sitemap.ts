import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { legalPages } from "@/lib/legal-data";
import { getProperties } from "@/lib/properties";
import { seoLocations } from "@/lib/seo-locations";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const properties = await getProperties();

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...seoLocations.map((location) => ({
      url: `${baseUrl}/staycation/${location.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...["support", "hosting", "company", "legal", "trust-and-safety", "status"].map((route) => ({
      url: `${baseUrl}/${route}`,
      lastModified: new Date("2026-05-19"),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...legalPages.map((page) => ({
      url: `${baseUrl}/legal/${page.slug}`,
      lastModified: new Date("2026-05-19"),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...properties
      .filter((property) => property.status === "approved")
      .map((property) => ({
        url: `${baseUrl}/rooms/${property.id}`,
        lastModified: new Date(property.createdAt ?? new Date()),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
  ];
}
