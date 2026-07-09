import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { legalPages } from "@/lib/legal-data";
import { getProperties } from "@/lib/properties";
import { getPropertyLocationSearchText } from "@/lib/property-location";
import { seoLocations } from "@/lib/seo-locations";
import { newsArticles } from "@/lib/newsroom-data";
import { seoBlogArticles } from "@/lib/seo-blog-data";

const staticLastModified = new Date("2026-07-10");

function validDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function latestDate(values: Array<string | undefined>) {
  const dates = values.map(validDate).filter((date): date is Date => Boolean(date));
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const properties = await getProperties();
  const approvedProperties = properties.filter((property) => property.status === "approved");
  const latestListingDate = latestDate(approvedProperties.map((property) => property.createdAt));
  const latestEditorialDate = latestDate([
    ...newsArticles.map((article) => article.date),
    ...seoBlogArticles.map((article) => article.date),
  ]);
  const latestPublicDate = latestDate([
    latestListingDate?.toISOString(),
    latestEditorialDate?.toISOString(),
  ]) ?? staticLastModified;

  return [
    {
      url: baseUrl,
      lastModified: latestPublicDate,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: latestListingDate ?? staticLastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...seoLocations.map((location) => {
      const latestLocationListingDate = latestDate(
        approvedProperties
          .filter((property) => getPropertyLocationSearchText(property).includes(location.query))
          .map((property) => property.createdAt),
      );

      return {
        url: `${baseUrl}/staycation/${location.slug}`,
        lastModified: latestLocationListingDate ?? latestListingDate ?? staticLastModified,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    }),
    {
      url: `${baseUrl}/newsroom`,
      lastModified: latestDate(newsArticles.map((article) => article.date)) ?? staticLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...newsArticles.map((article) => ({
      url: `${baseUrl}/newsroom/${article.slug}`,
      lastModified: new Date(article.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${baseUrl}/blog`,
      lastModified: latestDate(seoBlogArticles.map((article) => article.date)) ?? staticLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...seoBlogArticles.map((article) => ({
      url: `${baseUrl}/blog/${article.slug}`,
      lastModified: new Date(article.date),
      changeFrequency: "monthly" as const,
      priority: 0.65,
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
    ...approvedProperties
      .map((property) => ({
        url: `${baseUrl}/rooms/${property.id}`,
        lastModified: new Date(property.createdAt ?? new Date()),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
  ];
}
