import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HostSignupFlow } from "@/components/forms/host-signup-flow";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { normalizeKnownAppPath } from "@/lib/canonical-paths";
import { isGoogleAuthEnabled } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create a Host Account",
  description: "Create a StayPrime PH host account to list a property and manage short-term rental bookings.",
  alternates: { canonical: "/register/host" },
};

export default async function RegisterHostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? normalizeKnownAppPath(next) : undefined;
  const currentUser = await getCurrentUser();
  if (currentUser) redirect(nextPath ?? roleHome(currentUser.role));

  return <HostSignupFlow error={error} message={message} nextPath={nextPath} googleAuthEnabled={isGoogleAuthEnabled()} />;
}
