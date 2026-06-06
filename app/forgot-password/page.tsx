import { requestPasswordReset } from "@/app/auth/actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const query = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-[#faf7f4] p-4">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-6 soft-card">
        <h1 className="text-3xl font-bold">Reset password</h1>
        <p className="mt-2 text-sm text-black/60">We’ll email a secure reset link if that address has an account.</p>
        {query.sent ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">Check your email for the reset link.</p> : null}
        {query.error ? <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{query.error}</p> : null}
        <form action={requestPasswordReset} className="mt-5 space-y-3">
          <label className="block">
            <span className="sr-only">Email</span>
            <input name="email" type="email" required placeholder="Email" className="min-h-12 w-full rounded-2xl border p-4" />
          </label>
          <button className="min-h-12 w-full rounded-2xl bg-[#21170f] font-semibold text-white">Email reset link</button>
        </form>
      </section>
    </main>
  );
}
