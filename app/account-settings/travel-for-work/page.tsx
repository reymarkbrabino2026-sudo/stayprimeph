import { redirect } from "next/navigation";
import { TravelForWorkSettings } from "@/components/account/travel-for-work-settings";
import { AccountSettingsShell } from "@/components/account/settings-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function TravelForWorkPage() {
  if (!(await getCurrentUser())) redirect("/login");

  return (
    <AccountSettingsShell active="Travel for work">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Travel for work</h2>
      <p className="mt-3 text-black/65">Set up work travel details so receipts, business trips, and company stays are easier to manage.</p>
      <TravelForWorkSettings />
    </AccountSettingsShell>
  );
}
