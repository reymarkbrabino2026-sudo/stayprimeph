import { HeartHandshake } from "lucide-react";
import { redirect } from "next/navigation";
import { DonationSettings } from "@/components/account/donation-settings";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { getCurrentUser } from "@/lib/auth";

export default async function DonationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const accountSettings = await getAccountSettings(user);

  return (
    <AccountSettingsShell active="Payments">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Payments</h2>
      <SettingsTabs tabs={[{ label: "Payments", href: "/account-settings/payments" }, { label: "Payouts", href: "/account-settings/payments/payouts" }, { label: "Service fee", href: "/account-settings/payments/service-fee" }, { label: "Donations", href: "/account-settings/payments/donations", active: true }]} />
      <section className="mt-10">
        <HeartHandshake className="text-[#083f35]" size={38} strokeWidth={1.7} />
        <h3 className="mt-5 text-2xl font-semibold">Donations</h3>
        <p className="mt-2 text-black/65">Support nonprofit stays by adding a donation preference to eligible bookings and payouts.</p>
      </section>
      <DonationSettings initialFinancial={accountSettings.financial} requiresStepUp={user.role === "host"} />
    </AccountSettingsShell>
  );
}
