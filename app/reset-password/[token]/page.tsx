import { resetPassword } from "@/app/auth/actions";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResetPasswordPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const query = await searchParams;
  const action = resetPassword.bind(null, token);
  const emailError = query.error === "Email does not match this reset link." ? query.error : undefined;
  const formError = emailError ? undefined : query.error;
  return (
    <main className="grid min-h-dvh place-items-center bg-[#faf7f4] p-4">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-6 soft-card">
        <h1 className="text-3xl font-bold">Choose a new password</h1>
        {formError ? <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{formError}</p> : null}
        <ResetPasswordForm action={action} emailError={emailError} />
      </section>
    </main>
  );
}
