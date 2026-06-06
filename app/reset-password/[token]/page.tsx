import { resetPassword } from "@/app/auth/actions";

export default async function ResetPasswordPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const query = await searchParams;
  const action = resetPassword.bind(null, token);
  return (
    <main className="grid min-h-dvh place-items-center bg-[#faf7f4] p-4">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-6 soft-card">
        <h1 className="text-3xl font-bold">Choose a new password</h1>
        {query.error ? <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{query.error}</p> : null}
        <form action={action} className="mt-5 space-y-3">
          <label className="block">
            <span className="sr-only">New password</span>
            <input name="password" type="password" minLength={8} required placeholder="New password" className="min-h-12 w-full rounded-2xl border p-4" />
          </label>
          <button className="min-h-12 w-full rounded-2xl bg-[#21170f] font-semibold text-white">Save password</button>
        </form>
      </section>
    </main>
  );
}
