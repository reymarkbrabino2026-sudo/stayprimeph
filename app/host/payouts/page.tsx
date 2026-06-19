import Link from "next/link";

import { PayoutSettings } from "@/components/account/payout-settings";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { requireRole } from "@/lib/auth";
import { hostLinks } from "@/lib/navigation";

export default async function HostPayoutsPage() {
  const user = await requireRole(["host", "admin"], {
    redirectTo: "/login?role=host",
    roleRedirects: { guest: "/become-a-host/upgrade" },
    forbiddenRedirectTo: "/",
  });
  const accountSettings = await getAccountSettings(user);
  const hasPayoutMethod = accountSettings.financial.payoutMethods.length > 0;

  return (
    <DashboardShell
      title="Payout Settings"
      subtitle="Host dashboard"
      description="Add the account where StayPrimePH should send your hosting payouts."
      links={hostLinks}
    >
      <section className="rounded-[1.75rem] bg-white p-5 soft-card sm:p-7">
        <div className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Payout account</p>
            <h2 className="mt-2 text-2xl font-bold">Receive host earnings</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
              Set up a bank account, GCash, or PayPal payout method so StayPrimePH can send your approved host payouts to the right account.
            </p>
          </div>
          <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-semibold ${hasPayoutMethod ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
            {hasPayoutMethod ? "Ready for payouts" : "Setup required"}
          </span>
        </div>

        <PayoutSettings initialFinancial={accountSettings.financial} requiresStepUp={user.role === "host"} />
      </section>

      <p className="mt-5 text-sm text-black/55">
        Need to update tax details too? Manage them in <Link href="/account-settings/taxes" className="font-semibold underline">tax settings</Link>.
      </p>
    </DashboardShell>
  );
}
