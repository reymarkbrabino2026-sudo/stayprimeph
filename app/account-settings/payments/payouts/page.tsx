import { redirect } from "next/navigation";
import { PayoutSettings } from "@/components/account/payout-settings";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function PayoutsPage() {
  if (!(await getCurrentUser())) redirect("/login");
  return (
    <AccountSettingsShell active="Payments">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Payments</h2>
      <SettingsTabs tabs={[{ label: "Payments", href: "/account-settings/payments" }, { label: "Payouts", href: "/account-settings/payments/payouts", active: true }, { label: "Service fee", href: "/account-settings/payments/service-fee" }, { label: "Donations", href: "/account-settings/payments/donations" }]} />
      <PayoutSettings />
    </AccountSettingsShell>
  );
}
