import { AuthForm } from "@/components/forms/auth-form";
import { signIn, signInWithFacebook, signInWithGoogle } from "@/app/auth/actions";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string; next?: string }>;
}) {
  const { role, error, next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const currentUser = await getCurrentUser();
  if (currentUser) redirect(nextPath ?? roleHome(currentUser.role));

  const requestedRole = role === "host" || role === "guest" || role === "admin" ? role : undefined;
  const registerHref = (() => {
    const params = new URLSearchParams();
    if (requestedRole === "host") params.set("role", "host");
    if (nextPath) params.set("next", nextPath);
    const query = params.toString();
    return `/register${query ? `?${query}` : ""}`;
  })();
  const heading =
    requestedRole === "host"
      ? "Log in to start hosting"
      : requestedRole === "admin"
        ? "Admin sign in"
        : requestedRole === "guest"
          ? "Guest sign in"
          : "Welcome back";
  const helperText =
    requestedRole === "host"
      ? "Use your account to manage listings, availability, and bookings."
      : requestedRole === "admin"
        ? "Use your admin account to review listings, users, and platform activity."
        : requestedRole === "guest"
          ? "Use your guest account to book stays, save wishlists, and manage trips."
          : undefined;

  return (
    <AuthForm
      mode={heading}
      submitLabel="Log in"
      prompt="New here?"
      href={registerHref}
      linkText="Create account"
      action={signIn}
      googleAction={signInWithGoogle}
      facebookAction={signInWithFacebook}
      helperText={helperText}
      error={error}
      requestedRole={requestedRole}
      nextPath={nextPath}
    />
  );
}
