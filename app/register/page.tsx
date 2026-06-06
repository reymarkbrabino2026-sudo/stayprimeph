import { AuthForm } from "@/components/forms/auth-form";
import { HostSignupFlow } from "@/components/forms/host-signup-flow";
import { signInWithFacebook, signInWithGoogle, signUp } from "@/app/auth/actions";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string; next?: string }>;
}) {
  const { role, error, next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const currentUser = await getCurrentUser();
  if (currentUser) redirect(nextPath ?? roleHome(currentUser.role));

  if (role === "host") {
    return <HostSignupFlow error={error} />;
  }

  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";

  return <AuthForm mode="Create account" submitLabel="Register" prompt="Already have an account?" href={loginHref} linkText="Log in" action={signUp} googleAction={signInWithGoogle} facebookAction={signInWithFacebook} error={error} showName showRole nextPath={nextPath} />;
}
