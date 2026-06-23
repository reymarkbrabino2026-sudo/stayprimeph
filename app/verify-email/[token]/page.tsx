import Link from "next/link";
import { verifyEmailToken } from "@/app/auth/actions";

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verified = await verifyEmailToken(token);
  return (
    <main className="grid min-h-dvh place-items-center bg-[#faf7f4] p-4">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center soft-card">
        <h1 className="text-3xl font-bold">{verified ? "Email verified" : "Link expired"}</h1>
        <p className="mt-3 text-sm text-black/60">{verified ? "Your account is ready to use." : "Request a fresh verification code or contact support."}</p>
        <Link href="/login" className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-[#21170f] px-5 font-semibold text-white">Go to login</Link>
      </section>
    </main>
  );
}
