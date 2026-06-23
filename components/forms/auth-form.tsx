import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AuthSubmitButton } from "@/components/forms/auth-submit-button";
import { PasswordInput } from "@/components/forms/password-input";

export function AuthForm({
  mode,
  submitLabel,
  prompt,
  href,
  linkText,
  action,
  googleAction,
  facebookAction,
  showName = false,
  showRole = false,
  helperText,
  error,
  message,
  requestedRole,
  signupRole,
  nextPath,
  secondaryPrompt,
  secondaryHref,
  secondaryLinkText,
}: {
  mode: string;
  submitLabel: string;
  prompt: string;
  href: string;
  linkText: string;
  action: (formData: FormData) => Promise<void>;
  googleAction?: (formData: FormData) => Promise<void>;
  facebookAction?: (formData: FormData) => Promise<void>;
  showName?: boolean;
  showRole?: boolean;
  helperText?: string;
  error?: string;
  message?: string;
  requestedRole?: "guest" | "host" | "admin";
  signupRole?: "guest" | "host";
  nextPath?: string;
  secondaryPrompt?: string;
  secondaryHref?: string;
  secondaryLinkText?: string;
}) {
  const isCreateAccount = showName;

  return (
    <main className="min-h-dvh bg-[#faf7f4] px-4 py-4 sm:px-6">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-center py-2 sm:py-4">
        <Link href="/" aria-label="Go to StayPrimePH homepage" className="inline-flex items-center">
          <BrandLogo className="h-8 w-auto" />
        </Link>
      </header>

      <section className="grid min-h-[calc(100dvh-5.5rem)] place-items-center py-6">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-5 soft-card sm:p-6">
          <h1 className="text-3xl font-bold">{mode}</h1>
          {helperText && <p className="mt-2 text-sm text-black/55">{helperText}</p>}
          {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {message && <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          <form action={action} className="mt-6 space-y-3">
            {requestedRole ? <input type="hidden" name="requestedRole" value={requestedRole} /> : null}
            {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
            {showName && (
              <div>
                <label htmlFor="auth-name" className="sr-only">Full name</label>
                <input id="auth-name" name="name" className="min-h-12 w-full rounded-2xl border p-4" placeholder="Full name" autoComplete="name" required />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="sr-only">Email</label>
              <input id="auth-email" name="email" className="min-h-12 w-full rounded-2xl border p-4" placeholder="Email" type="email" autoComplete="email" required />
            </div>
            {signupRole ? <input type="hidden" name="role" value={signupRole} /> : null}
            {showRole && (
              <div>
                <label htmlFor="auth-role" className="sr-only">Account role</label>
                <select id="auth-role" aria-label="Account role" name="role" className="min-h-12 w-full rounded-2xl border p-4">
                  <option value="guest">Guest</option>
                  <option value="host">Host</option>
                </select>
              </div>
            )}
            <div>
              <label htmlFor="auth-password" className="sr-only">Password</label>
              <PasswordInput
                id="auth-password"
                name="password"
                className="min-h-12 w-full rounded-2xl border p-4"
                placeholder="Password"
                minLength={showName ? 12 : undefined}
                autoComplete={showName ? "new-password" : "current-password"}
                aria-describedby={showName ? "auth-password-help" : undefined}
                required
              />
              {showName ? (
                <p id="auth-password-help" className="mt-2 text-xs leading-5 text-black/55">
                  Use 12+ characters with uppercase, lowercase, a number, and a symbol. Avoid your name or email.
                </p>
              ) : null}
            </div>
            {showName ? (
              <div>
                <label htmlFor="auth-confirm-password" className="sr-only">Confirm password</label>
                <PasswordInput
                  id="auth-confirm-password"
                  name="confirmPassword"
                  className="min-h-12 w-full rounded-2xl border p-4"
                  placeholder="Confirm password"
                  minLength={12}
                  autoComplete="new-password"
                  required
                />
              </div>
            ) : null}
            {!showName ? <Link href="/forgot-password" className="block text-sm font-semibold text-[#a8431f]">Forgot password?</Link> : null}
            <AuthSubmitButton label={submitLabel} pendingLabel={isCreateAccount ? "Creating account" : "Signing in"} />
          </form>
          {googleAction ? (
            <form action={googleAction} className="mt-3">
              <input type="hidden" name="authMode" value={showName ? "register" : "login"} />
              {requestedRole ? <input type="hidden" name="requestedRole" value={requestedRole} /> : null}
              {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
              <AuthSubmitButton label="Continue with Google" pendingLabel="Connecting to Google" variant="secondary" />
            </form>
          ) : null}
          {facebookAction ? (
            <form action={facebookAction} className="mt-3">
              <input type="hidden" name="authMode" value={showName ? "register" : "login"} />
              {requestedRole ? <input type="hidden" name="requestedRole" value={requestedRole} /> : null}
              {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
              <AuthSubmitButton label="Continue with Facebook" pendingLabel="Connecting to Facebook" variant="secondary" />
            </form>
          ) : null}
          <p className="mt-5 text-sm text-black/55">
            {prompt}{" "}
            <Link className="font-semibold text-[#a8431f]" href={href}>
              {linkText}
            </Link>
          </p>
          {secondaryPrompt && secondaryHref && secondaryLinkText ? (
            <p className="mt-3 text-sm text-black/55">
              {secondaryPrompt}{" "}
              <Link className="font-semibold text-[#a8431f]" href={secondaryHref}>
                {secondaryLinkText}
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
