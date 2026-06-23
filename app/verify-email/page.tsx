import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AuthSubmitButton } from "@/components/forms/auth-submit-button";
import { resendVerificationCode, verifyEmailCode } from "@/app/auth/actions";
import { normalizeKnownAppPath } from "@/lib/canonical-paths";

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return normalizeKnownAppPath(value);
}

export default async function VerifyEmailCodePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; message?: string; role?: string; next?: string }>;
}) {
  const { email, error, message, role, next } = await searchParams;
  const requestedRole = role === "host" || role === "guest" || role === "admin" ? role : undefined;
  const nextPath = safeNextPath(next);
  const loginHref = (() => {
    const params = new URLSearchParams();
    if (requestedRole) params.set("role", requestedRole);
    if (nextPath) params.set("next", nextPath);
    const query = params.toString();
    const path = requestedRole === "admin" ? "/admin/login" : "/login";
    return `${path}${query ? `?${query}` : ""}`;
  })();

  return (
    <main className="min-h-dvh bg-[#faf7f4] px-4 py-4 sm:px-6">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-center py-2 sm:py-4">
        <Link href="/" aria-label="Go to StayPrimePH homepage" className="inline-flex items-center">
          <BrandLogo className="h-8 w-auto" />
        </Link>
      </header>

      <section className="grid min-h-[calc(100dvh-5.5rem)] place-items-center py-6">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-5 soft-card sm:p-6">
          <h1 className="text-3xl font-bold">Verify email</h1>
          <p className="mt-2 text-sm text-black/55">Enter the 6-digit code sent to your email.</p>
          {error && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          <form action={verifyEmailCode} className="mt-6 space-y-3">
            {requestedRole ? <input type="hidden" name="role" value={requestedRole} /> : null}
            {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
            <input name="email" type="email" defaultValue={email ?? ""} className="min-h-12 w-full rounded-2xl border p-4" placeholder="Email" required />
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
            <AuthSubmitButton label="Verify email" />
          </form>
          {email ? (
            <form action={resendVerificationCode} className="mt-3">
              <input type="hidden" name="email" value={email} />
              {requestedRole ? <input type="hidden" name="role" value={requestedRole} /> : null}
              {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
              <AuthSubmitButton label="Resend code" pendingLabel="Resending code" variant="secondary" />
            </form>
          ) : null}
          <p className="mt-5 text-sm text-black/55">
            Already verified?{" "}
            <Link className="font-semibold text-[#a8431f]" href={loginHref}>
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
