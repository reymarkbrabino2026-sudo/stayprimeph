import { redirect } from "next/navigation";
import { PrivacySettings } from "@/components/account/privacy-settings";
import { AccountSettingsShell } from "@/components/account/settings-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { getCurrentUser } from "@/lib/auth";

export default async function PrivacyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const accountSettings = await getAccountSettings(user);
  return (
    <AccountSettingsShell active="Privacy">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Privacy</h2>
      <PrivacySettings initialState={accountSettings.privacy} />
    </AccountSettingsShell>
  );
}
