import { redirect } from "next/navigation";
import { CircleDollarSign, LockKeyhole, WalletCards } from "lucide-react";

import { PersonalInfoEditor } from "@/components/account/personal-info-editor";
import { AccountSettingsShell } from "@/components/account/settings-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { getCurrentUser } from "@/lib/auth";

const infoCards = [
  { title: "Why isn't my info shown here?", body: "We're hiding some account details to protect your identity.", icon: LockKeyhole },
  { title: "Which details can be edited?", body: "Contact info and personal details can be edited. If this info was used to verify your identity, you'll need to get verified again the next time you book or continue hosting.", icon: WalletCards },
  { title: "What info is shared with others?", body: "StayPrimePH only releases contact information for Hosts and guests after a reservation is confirmed.", icon: CircleDollarSign },
];

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const accountSettings = await getAccountSettings(user);

  return (
    <AccountSettingsShell active="Personal information">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Personal information</h2>
      <PersonalInfoEditor user={{ id: user.id, name: user.name, email: user.email, phone: user.phone }} initialProfile={accountSettings.personalInfo} />
      <div className="mt-12 rounded-2xl border border-black/15 px-6">
        {infoCards.map(({ title, body, icon: Icon }, index) => (
          <div key={title} className={`flex gap-5 py-6 ${index > 0 ? "border-t border-black/15" : ""}`}>
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#083f35] text-[#083f35]">
              <Icon size={24} strokeWidth={1.7} />
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.02em]">{title}</h3>
              <p className="mt-2 text-sm leading-5 text-black/65">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </AccountSettingsShell>
  );
}
