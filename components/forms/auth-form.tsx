import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

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
    <main className="grid min-h-dvh place-items-center bg-[#faf7f4] p-4 sm:p-6">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-5 soft-card sm:p-6">
        <BrandLogo className="h-7 w-auto" />
        <h1 className="mt-2 text-3xl font-bold">{mode}</h1>
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
          <input name="password" className="min-h-12 w-full rounded-2xl border p-4" placeholder="Password" type="password" minLength={8} required />
          {!showName ? <Link href="/forgot-password" className="block text-sm font-semibold text-[#a8431f]">Forgot password?</Link> : null}
          <button className="mt-2 min-h-12 w-full rounded-2xl bg-[#21170f] py-4 font-semibold text-white">
            {submitLabel}
          </button>
        </form>
        <form action={googleAction} className="mt-3">
          <input type="hidden" name="authMode" value={showName ? "register" : "login"} />
          {requestedRole ? <input type="hidden" name="requestedRole" value={requestedRole} /> : null}
          {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
          <button className="min-h-12 w-full rounded-2xl border py-4 font-semibold disabled:cursor-not-allowed disabled:opacity-60" disabled={!googleAction}>
            Continue with Google
          </button>
        </form>
        <form action={facebookAction} className="mt-3">
          <input type="hidden" name="authMode" value={showName ? "register" : "login"} />
          {requestedRole ? <input type="hidden" name="requestedRole" value={requestedRole} /> : null}
          {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
          <button className="min-h-12 w-full rounded-2xl border py-4 font-semibold text-[#0f5fc4] disabled:cursor-not-allowed disabled:opacity-60" disabled={!facebookAction}>
            Continue with Facebook
          </button>
        </form>
        <p className="mt-5 text-sm text-black/55">
          {prompt}{" "}
          <Link className="font-semibold text-[#a8431f]" href={href}>
            {linkText}
          </Link>
        </p>
      </div>
    </main>
  );
}
