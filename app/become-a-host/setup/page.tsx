import { HostListingWizard } from "@/components/host-wizard/host-listing-wizard";
import { requireRole } from "@/lib/auth";
import { getCsrfToken } from "@/lib/csrf";

export default async function BecomeAHostSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const query = await searchParams;
  const user = await requireRole("host", {
    redirectTo: "/register?role=host",
    roleRedirects: { guest: "/become-a-host/upgrade" },
    forbiddenRedirectTo: "/login?role=host",
  });
  const csrfToken = await getCsrfToken();

  return <HostListingWizard user={{ id: user.id, email: user.email }} csrfToken={csrfToken} freshStart={query.new === "1"} />;
}
