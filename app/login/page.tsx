import Link from "next/link";
import { AuthForm } from "@/components/forms/auth-form";
import { resendAdminMfa, signIn, signInWithFacebook, signInWithGoogle, verifyAdminMfa } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AuthSubmitButton } from "@/components/forms/auth-submit-button";
import { readPendingAdminMfaChallenge } from "@/lib/admin-mfa";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { getAuthToken } from "@/lib/auth-tokens";
import { normalizeKnownAppPath } from "@/lib/canonical-paths";
import { getUserById } from "@/lib/users";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string; message?: string; mfa?: string; next?: string }>;
}) {
  const { role, error, message, mfa, next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? normalizeKnownAppPath(next) : undefined;
  if (role === "admin") {
    const params = new URLSearchParams();
    if (error) params.set("error", error);
    if (nextPath) params.set("next", nextPath);
    const query = params.toString();
    redirect(`/admin/login${query ? `?${query}` : ""}`);
  }

  const currentUser = await getCurrentUser();
  if (currentUser) redirect(nextPath ?? roleHome(currentUser.role));

  const requestedRole = role === "host" || role === "guest" ? role : undefined;
  if (mfa === "1" && requestedRole === "host") {
    const rawToken = await readPendingAdminMfaChallenge();
    const pendingToken = rawToken ? await getAuthToken(rawToken, "admin_mfa") : null;
    const pendingUser = pendingToken ? await getUserById(pendingToken.userId) : null;
    if (!pendingToken || pendingUser?.role !== "host") {
      redirect(`/login?role=host&error=${encodeURIComponent("Host sign-in challenge expired. Log in again.")}`);
    }

    return (
      <main className="min-h-dvh bg-[#faf7f4] px-4 py-4 sm:px-6">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-center py-2 sm:py-4">
          <Link href="/" aria-label="Go to StayPrimePH homepage" className="inline-flex items-center">
            <BrandLogo className="h-8 w-auto" />
          </Link>
        </header>

        <section className="grid min-h-[calc(100dvh-5.5rem)] place-items-center py-6">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-5 soft-card sm:p-6">
            <h1 className="text-3xl font-bold">Host verification</h1>
            <p className="mt-2 text-sm text-black/55">Enter the 6-digit code sent to your host account email.</p>
            {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {message && <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
            <form action={verifyAdminMfa} className="mt-6 space-y-3">
              <input type="hidden" name="role" value="host" />
              {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
              <input
                name="code"
                className="min-h-12 w-full rounded-2xl border p-4 text-center text-2xl font-semibold tracking-[0.35em]"
                placeholder="000000"
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
              <AuthSubmitButton label="Verify code" />
            </form>
            <form action={resendAdminMfa} className="mt-3">
              <input type="hidden" name="role" value="host" />
              {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
              <AuthSubmitButton label="Resend code" pendingLabel="Resending code" variant="secondary" />
            </form>
            <p className="mt-4 text-sm text-black/55">
              Still having trouble?{" "}
              <Link className="font-semibold text-[#a8431f]" href={`/login?role=host${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}`}>
                Sign in again
              </Link>
            </p>
          </div>
        </section>
      </main>
    );
  }

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
      : requestedRole === "guest"
          ? "Guest sign in"
          : "Welcome back";
  const helperText =
    requestedRole === "host"
      ? "Use your account to manage listings, availability, and bookings."
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
      message={message}
      requestedRole={requestedRole}
      nextPath={nextPath}
    />
  );
}
