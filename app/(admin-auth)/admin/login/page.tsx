import Link from "next/link";
import { resendAdminMfa, signIn, verifyAdminMfa } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AuthForm } from "@/components/forms/auth-form";
import { AuthSubmitButton } from "@/components/forms/auth-submit-button";
import { readPendingAdminMfaChallenge } from "@/lib/admin-mfa";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { getAuthToken } from "@/lib/auth-tokens";
import { normalizeKnownAppPath } from "@/lib/canonical-paths";
import { redirect } from "next/navigation";

function strictAdminNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/admin/dashboard";

  const normalized = normalizeKnownAppPath(value);
  try {
    const url = new URL(normalized, "http://stayprimeph.local");
    const pathname = url.pathname.toLowerCase();
    if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return "/admin/dashboard";
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return normalized;
  } catch {
    return "/admin/dashboard";
  }

  return "/admin/dashboard";
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; mfa?: string; next?: string }>;
}) {
  const { error, message, mfa, next } = await searchParams;
  const nextPath = strictAdminNextPath(next);

  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(
      currentUser.role === "admin"
        ? nextPath
        : roleHome(currentUser.role)
    );
  }

  if (mfa === "1") {
    const rawToken = await readPendingAdminMfaChallenge();
    const pendingToken = rawToken ? await getAuthToken(rawToken, "admin_mfa") : null;
    if (!pendingToken) {
      redirect(`/admin/login?error=${encodeURIComponent("Admin sign-in challenge expired. Log in again.")}`);
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
            <h1 className="text-3xl font-bold">Admin verification</h1>
            <p className="mt-2 text-sm text-black/55">Enter the 6-digit code sent to the admin email to finish signing in.</p>
            {error && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
            <form action={verifyAdminMfa} className="mt-6 space-y-3">
              <input type="hidden" name="next" value={nextPath} />
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
              <input type="hidden" name="next" value={nextPath} />
              <AuthSubmitButton label="Resend code" pendingLabel="Resending code" variant="secondary" />
            </form>
            <p className="mt-4 text-sm text-black/55">
              Still having trouble?{" "}
              <Link className="font-semibold text-[#a8431f]" href={`/admin/login?next=${encodeURIComponent(nextPath)}`}>
                Sign in again
              </Link>
            </p>
          </div>
        </section>
      </main>
    );
  }

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
      message={message}
      requestedRole="admin"
      nextPath={nextPath}
    />
  );
}
