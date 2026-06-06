import { HostListingWizard } from "@/components/host-wizard/host-listing-wizard";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BecomeAHostSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();

  if (!user) redirect("/register?role=host");
  if (user.role === "guest") redirect("/become-a-host/upgrade");
  if (user.role !== "host") redirect("/login?role=host");

  return <HostListingWizard user={{ id: user.id, email: user.email }} freshStart={query.new === "1"} />;
}
