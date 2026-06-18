import Link from "next/link";
import { verifyAccountDeletionRequest } from "@/lib/account-deletion";

export default async function VerifyAccountDeletionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verified = await verifyAccountDeletionRequest(token);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#faf7f4] p-4">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center soft-card">
        <h1 className="text-3xl font-bold">{verified ? "Deletion request verified" : "Link expired"}</h1>
        <p className="mt-3 text-sm text-black/60">
          {verified
            ? "Your request is verified. StayPrimePH admins can now review and anonymize eligible account data."
            : "Request a fresh deletion verification link from your privacy settings."}
        </p>
        <Link href="/account-settings/privacy" className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-[#21170f] px-5 font-semibold text-white">
          Go to privacy settings
        </Link>
      </section>
    </main>
  );
}
