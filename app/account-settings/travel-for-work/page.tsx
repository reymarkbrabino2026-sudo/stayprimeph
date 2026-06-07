import { redirect } from "next/navigation";
import { TravelForWorkSettings } from "@/components/account/travel-for-work-settings";
import { AccountSettingsShell } from "@/components/account/settings-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { getCurrentUser } from "@/lib/auth";

export default async function TravelForWorkPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const accountSettings = await getAccountSettings(user);

  return (
    <AccountSettingsShell active="Travel for work">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Travel for work</h2>
      <p className="mt-3 text-black/65">Set up work travel details so receipts, business trips, and company stays are easier to manage.</p>
      <TravelForWorkSettings initialProfile={accountSettings.workTravel} />
    </AccountSettingsShell>
  );
}
