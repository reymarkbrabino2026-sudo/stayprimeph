import { redirect } from "next/navigation";
import { PrivacySettings } from "@/components/account/privacy-settings";
import { AccountSettingsShell } from "@/components/account/settings-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function PrivacyPage() {
  if (!(await getCurrentUser())) redirect("/login");
  return (
    <AccountSettingsShell active="Privacy">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Privacy</h2>
      <PrivacySettings />
    </AccountSettingsShell>
  );
}
