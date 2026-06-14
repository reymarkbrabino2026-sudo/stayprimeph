import { signIn } from "@/app/auth/actions";
import { AuthForm } from "@/components/forms/auth-form";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/admin/dashboard";
  const currentUser = await getCurrentUser();
  if (currentUser) redirect(currentUser.role === "admin" ? nextPath : roleHome(currentUser.role));

  return (
    <AuthForm
      mode="Admin sign in"
      submitLabel="Log in"
      prompt="Not an admin?"
      href="/"
      linkText="Return home"
      action={signIn}
      helperText="Use your admin account to review listings, users, bookings, and platform activity."
      error={error}
      requestedRole="admin"
      nextPath={nextPath}
    />
  );
}
