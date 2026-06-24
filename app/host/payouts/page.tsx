import Link from "next/link";

import { PayoutSettings } from "@/components/account/payout-settings";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { requireRole } from "@/lib/auth";
import { hostLinks } from "@/lib/navigation";
import { getHostEarningsSummary } from "@/lib/payouts";
import { formatCurrency } from "@/lib/utils";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function BalanceCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? "bg-[#083f35] text-white" : "bg-white soft-card"}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${accent ? "text-white/70" : "text-black/45"}`}>{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default async function HostPayoutsPage() {
  const user = await requireRole(["host", "admin"], {
    redirectTo: "/login?role=host",
    roleRedirects: { guest: "/become-a-host/upgrade" },
    forbiddenRedirectTo: "/",
  });
  const [accountSettings, earnings] = await Promise.all([getAccountSettings(user), getHostEarningsSummary(user.id)]);
  const hasPayoutMethod = accountSettings.financial.payoutMethods.length > 0;

  return (
    <DashboardShell
      title="Earnings & Payouts"
      subtitle="Host dashboard"
      description="Track what you've earned and the account where StayPrimePH sends your payouts."
      links={hostLinks}
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard label="Available now" value={formatCurrency(earnings.availableBalance)} accent />
        <BalanceCard label="Pending clearance" value={formatCurrency(earnings.pendingClearance)} />
        <BalanceCard label="Lifetime earnings" value={formatCurrency(earnings.lifetimeEarnings)} />
        <BalanceCard label="Paid out" value={formatCurrency(earnings.totalPaidOut)} />
      </section>
      <p className="mt-3 text-sm text-black/55">
        Each guest payment includes the host price plus the 20% StayPrimePH markup. The markup is added to the StayPrimePH
        balance, and the host payout is sent per transaction within 24 hours after payment is received whenever possible.
      </p>

      {earnings.payouts.length > 0 ? (
        <section className="mt-6 overflow-hidden rounded-[1.5rem] bg-white soft-card">
          <h2 className="border-b border-black/10 p-5 font-semibold">Payout history</h2>
          <ul className="divide-y divide-black/[0.06]">
            {earnings.payouts.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold">{formatCurrency(payout.amount)}</p>
                  <p className="text-sm text-black/50">
                    Sent {formatDate(payout.createdAt)}{payout.bookingId ? ` - Booking ${payout.bookingId}` : ""}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 capitalize">
                  {payout.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 rounded-[1.75rem] bg-white p-5 soft-card sm:p-7">
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

        <PayoutSettings initialFinancial={accountSettings.financial} requiresStepUp={user.role === "host"} hasPassword={Boolean(user.passwordHash)} userEmail={user.email} />
      </section>

      <p className="mt-5 text-sm text-black/55">
        Need to update tax details too? Manage them in <Link href="/account-settings/taxes" className="font-semibold underline">tax settings</Link>.
      </p>
    </DashboardShell>
  );
}
