import { AuthForm } from "@/components/forms/auth-form";
import { HostSignupFlow } from "@/components/forms/host-signup-flow";
import { signInWithFacebook, signInWithGoogle, signUp } from "@/app/auth/actions";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string; message?: string; next?: string }>;
}) {
  const { role, error, message, next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const currentUser = await getCurrentUser();
  if (currentUser) redirect(nextPath ?? roleHome(currentUser.role));

  if (role === "host") {
    return <HostSignupFlow error={error} message={message} />;
  }

  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";

  return <AuthForm mode="Create account" submitLabel="Register" prompt="Already have an account?" href={loginHref} linkText="Log in" action={signUp} googleAction={signInWithGoogle} facebookAction={signInWithFacebook} error={error} message={message} showName showRole nextPath={nextPath} />;
}
