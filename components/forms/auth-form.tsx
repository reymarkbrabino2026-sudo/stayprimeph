import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
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
  requestedRole,
  nextPath,
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
  requestedRole?: "guest" | "host" | "admin";
  nextPath?: string;
}) {
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
          {error && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <form action={action} className="mt-6 space-y-3">
            {requestedRole ? <input type="hidden" name="requestedRole" value={requestedRole} /> : null}
            {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
            {showName && <input name="name" className="min-h-12 w-full rounded-2xl border p-4" placeholder="Full name" required />}
            <input name="email" className="min-h-12 w-full rounded-2xl border p-4" placeholder="Email" type="email" required />
            {showRole && (
              <select aria-label="Account role" name="role" className="min-h-12 w-full rounded-2xl border p-4">
                <option value="guest">Guest</option>
                <option value="host">Host</option>
              </select>
            )}
            <PasswordInput name="password" className="min-h-12 w-full rounded-2xl border p-4" placeholder="Password" minLength={8} required />
            {!showName ? <Link href="/forgot-password" className="block text-sm font-semibold text-[#a8431f]">Forgot password?</Link> : null}
            <button className="mt-2 min-h-12 w-full rounded-2xl bg-[#21170f] py-4 font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#352417] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21170f] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm">
              {submitLabel}
            </button>
          </form>
          {googleAction ? (
            <form action={googleAction} className="mt-3">
              <input type="hidden" name="authMode" value={showName ? "register" : "login"} />
              {requestedRole ? <input type="hidden" name="requestedRole" value={requestedRole} /> : null}
              {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
              <button className="min-h-12 w-full rounded-2xl border bg-white py-4 font-semibold transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#21170f]/20 hover:bg-[#faf7f4] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21170f] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm">
                Continue with Google
              </button>
            </form>
          ) : null}
          {facebookAction ? (
            <form action={facebookAction} className="mt-3">
              <input type="hidden" name="authMode" value={showName ? "register" : "login"} />
              {requestedRole ? <input type="hidden" name="requestedRole" value={requestedRole} /> : null}
              {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
              <button className="min-h-12 w-full rounded-2xl border bg-white py-4 font-semibold text-[#0f5fc4] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#0f5fc4]/25 hover:bg-[#f4f8ff] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5fc4] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm">
                Continue with Facebook
              </button>
            </form>
          ) : null}
          <p className="mt-5 text-sm text-black/55">
            {prompt}{" "}
            <Link className="font-semibold text-[#a8431f]" href={href}>
              {linkText}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
