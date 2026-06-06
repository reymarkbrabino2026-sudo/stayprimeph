import { redirect } from "next/navigation";
import { ProfessionalHostingSettings } from "@/components/account/professional-hosting-settings";
import { AccountSettingsShell } from "@/components/account/settings-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfessionalHostingToolsPage() {
  if (!(await getCurrentUser())) redirect("/login");

  return (
    <AccountSettingsShell active="Professional hosting tools">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Professional hosting tools</h2>
      <p className="mt-3 text-black/65">Turn on tools built for hosts who want deeper control over listing operations.</p>
      <ProfessionalHostingSettings />
    </AccountSettingsShell>
  );
}
