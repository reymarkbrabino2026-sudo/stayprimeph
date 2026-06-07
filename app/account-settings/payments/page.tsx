import { CircleDollarSign } from "lucide-react";
import { redirect } from "next/navigation";
import { PaymentSettings } from "@/components/account/payment-settings";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { getCurrentUser } from "@/lib/auth";

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const accountSettings = await getAccountSettings(user);
  return (
    <AccountSettingsShell active="Payments">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Payments</h2>
      <PaymentTabs active="Payments" />
      <PaymentSettings initialFinancial={accountSettings.financial} />
      <div className="mt-8 flex gap-5 rounded-2xl border border-black/15 p-6"><CircleDollarSign className="text-[#083f35]" /><p><strong>Make all payments through StayPrimePH</strong><br /><span className="text-sm text-black/65">Always pay and communicate through StayPrimePH to ensure you&apos;re protected under our terms and safeguards.</span></p></div>
    </AccountSettingsShell>
  );
}

function PaymentTabs({ active }: { active: string }) {
  return <SettingsTabs tabs={[{ label: "Payments", href: "/account-settings/payments", active: active === "Payments" }, { label: "Payouts", href: "/account-settings/payments/payouts", active: active === "Payouts" }, { label: "Service fee", href: "/account-settings/payments/service-fee", active: active === "Service fee" }, { label: "Donations", href: "/account-settings/payments/donations", active: active === "Donations" }]} />;
}
