import { AuthForm } from "@/components/forms/auth-form";
import { HostSignupFlow } from "@/components/forms/host-signup-flow";
import { signInWithFacebook, signInWithGoogle, signUp } from "@/app/auth/actions";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { normalizeKnownAppPath } from "@/lib/canonical-paths";
import { isGoogleAuthEnabled } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string; message?: string; next?: string }>;
}) {
  const { role, error, message, next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? normalizeKnownAppPath(next) : undefined;
  const currentUser = await getCurrentUser();
  if (currentUser) redirect(nextPath ?? roleHome(currentUser.role));

  const googleAuthEnabled = isGoogleAuthEnabled();

  if (role === "host") {
    return <HostSignupFlow error={error} message={message} nextPath={nextPath} googleAuthEnabled={googleAuthEnabled} />;
  }

  const requestedRole = "guest";
  const loginHref = (() => {
    const params = new URLSearchParams();
    if (requestedRole) params.set("role", requestedRole);
    if (nextPath) params.set("next", nextPath);
    const query = params.toString();
    return `/login${query ? `?${query}` : ""}`;
  })();
  const helperText = nextPath ? "Create a guest account to continue." : "Create a guest account to book stays, save wishlists, and manage trips.";

  return (
    <AuthForm
      mode="Create account"
      submitLabel="Register"
      prompt="Already have an account?"
      href={loginHref}
      linkText="Log in"
      action={signUp}
      googleAction={googleAuthEnabled ? signInWithGoogle : undefined}
      facebookAction={signInWithFacebook}
      error={error}
      message={message}
      showName
      helperText={helperText}
      requestedRole={requestedRole}
      signupRole={requestedRole}
      nextPath={nextPath}
      secondaryPrompt="Planning to host?"
      secondaryHref="/register/host"
      secondaryLinkText="Create a host account"
    />
  );
}
