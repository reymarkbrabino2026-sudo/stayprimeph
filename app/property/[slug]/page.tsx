import { notFound, redirect } from "next/navigation";
import { getProperties } from "@/lib/properties";

export default async function LegacyPropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = (await getProperties()).find((item) => item.slug === slug);

  if (!property) notFound();

  redirect(`/properties/${property.id}`);
}

