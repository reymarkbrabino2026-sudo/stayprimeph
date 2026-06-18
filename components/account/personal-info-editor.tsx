"use client";

import { CheckCircle2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { savePersonalInfoAction } from "@/app/account-settings/actions";
import type { PersonalInfoField, PersonalInfoState } from "@/lib/account-settings-types";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

const fieldMeta: Array<{
  key: PersonalInfoField;
  label: string;
  actionWhenEmpty: string;
  actionWhenFilled: string;
  placeholder: string;
  help?: string;
  type?: "email" | "tel" | "textarea";
}> = [
  { key: "legalName", label: "Legal name", actionWhenEmpty: "Add", actionWhenFilled: "Edit", placeholder: "Enter your legal name" },
  { key: "preferredName", label: "Preferred first name", actionWhenEmpty: "Add", actionWhenFilled: "Edit", placeholder: "Enter the name guests and hosts should use" },
  { key: "email", label: "Email address", actionWhenEmpty: "Add", actionWhenFilled: "Edit", placeholder: "name@example.com", type: "email" },
  {
    key: "phone",
    label: "Phone numbers",
    actionWhenEmpty: "Add",
    actionWhenFilled: "Edit",
    placeholder: "+1 555 123 4567",
    help: "Add a number so confirmed guests and StayPrimePH can get in touch.",
    type: "tel",
  },
  { key: "identity", label: "Identity verification", actionWhenEmpty: "Start", actionWhenFilled: "Edit", placeholder: "Government ID submitted" },
  { key: "residentialAddress", label: "Residential address", actionWhenEmpty: "Add", actionWhenFilled: "Edit", placeholder: "Street, city, region, postal code", type: "textarea" },
  { key: "mailingAddress", label: "Mailing address", actionWhenEmpty: "Add", actionWhenFilled: "Edit", placeholder: "Street, city, region, postal code", type: "textarea" },
  { key: "emergencyContact", label: "Emergency contact", actionWhenEmpty: "Add", actionWhenFilled: "Edit", placeholder: "Name, relationship, phone number", type: "textarea" },
];

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name.charAt(0)}***${name.slice(-1)}@${domain}`;
}

function displayValue(key: PersonalInfoField, value: string) {
  if (!value) {
    if (key === "phone") return "Add a number so confirmed guests and StayPrimePH can get in touch. You can add other numbers and choose how they're used.";
    if (key === "identity") return "Not started";
    return "Not provided";
  }

  if (key === "email") return maskEmail(value);
  return value;
}

export function PersonalInfoEditor({ initialProfile }: { user: SessionUser; initialProfile: PersonalInfoState }) {
  const [profile, setProfile] = useState<PersonalInfoState>(initialProfile);
  const [activeField, setActiveField] = useState<PersonalInfoField | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const activeMeta = fieldMeta.find((item) => item.key === activeField);
  const emailRequiresReauth = activeMeta?.key === "email" && draftValue.trim().toLowerCase() !== profile.email.trim().toLowerCase();

  function openEditor(key: PersonalInfoField) {
    setActiveField(key);
    setDraftValue(profile[key]);
    setCurrentPassword("");
    setMessage("");
  }

  function closeEditor() {
    setActiveField(null);
    setDraftValue("");
    setCurrentPassword("");
  }

  function saveField() {
    if (!activeField) return;
    const nextProfile = { ...profile, [activeField]: draftValue.trim() };
    startTransition(async () => {
      const result = await savePersonalInfoAction(nextProfile, emailRequiresReauth ? currentPassword : undefined);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setProfile(result.data);
      setMessage(emailRequiresReauth ? "Check your new email address to confirm this change." : "Saved.");
      closeEditor();
    });
  }

  function startVerification() {
    const nextProfile = { ...profile, identity: "Verification started" };
    startTransition(async () => {
      const result = await savePersonalInfoAction(nextProfile);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setProfile(result.data);
      setMessage("Saved.");
      closeEditor();
    });
  }

  return (
    <>
      <div className="mt-5">
        {message ? <p className="mb-2 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
        {fieldMeta.map((row) => {
          const value = profile[row.key];
          const action = value ? row.actionWhenFilled : row.actionWhenEmpty;

          return (
            <div key={row.key} className="grid grid-cols-[1fr_auto] gap-6 border-b border-black/10 py-6">
              <div>
                <h3 className="font-semibold text-black">{row.label}</h3>
                <p className="mt-1 whitespace-pre-line text-sm leading-5 text-black/65">{displayValue(row.key, value)}</p>
              </div>
              <button type="button" onClick={() => openEditor(row.key)} className="pt-1 text-sm font-semibold underline">
                {action}
              </button>
            </div>
          );
        })}
      </div>

      {activeMeta ? (
        <div className="fixed inset-0 z-[700] grid place-items-center bg-black/40 px-4 py-8">
          <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgb(0_0_0_/_0.22)]">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold tracking-[-0.03em]">{activeMeta.label}</h3>
              <button type="button" onClick={closeEditor} aria-label="Close editor" className="grid size-10 place-items-center rounded-full hover:bg-black/[0.06]">
                <X size={20} />
              </button>
            </div>

            {activeMeta.key === "identity" ? (
              <div className="mt-6">
                <div className="flex gap-4 rounded-xl bg-[#e8f4ef] p-4 text-[#083f35]">
                  <CheckCircle2 className="mt-0.5 shrink-0" size={22} />
                  <p className="text-sm leading-5">Start verification to confirm your identity before booking or hosting sensitive reservations.</p>
                </div>
                <button type="button" onClick={startVerification} disabled={isPending} className="mt-6 min-h-12 rounded-xl bg-[#222] px-6 font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/25">
                  {isPending ? "Saving..." : "Start verification"}
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <label className="text-sm font-semibold" htmlFor={`account-${activeMeta.key}`}>
                  {activeMeta.label}
                </label>
                {activeMeta.type === "textarea" ? (
                  <textarea
                    id={`account-${activeMeta.key}`}
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                    placeholder={activeMeta.placeholder}
                    className="mt-2 min-h-32 w-full rounded-xl border border-black/20 px-4 py-3 outline-none focus:border-black"
                  />
                ) : (
                  <input
                    id={`account-${activeMeta.key}`}
                    type={activeMeta.type ?? "text"}
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                    placeholder={activeMeta.placeholder}
                    className="mt-2 min-h-12 w-full rounded-xl border border-black/20 px-4 outline-none focus:border-black"
                  />
                )}
                {activeMeta.help ? <p className="mt-2 text-sm leading-5 text-black/60">{activeMeta.help}</p> : null}
                {emailRequiresReauth ? (
                  <div className="mt-5">
                    <label className="text-sm font-semibold" htmlFor="account-current-password">
                      Current password
                    </label>
                    <input
                      id="account-current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="mt-2 min-h-12 w-full rounded-xl border border-black/20 px-4 outline-none focus:border-black"
                    />
                    <p className="mt-2 text-sm leading-5 text-black/60">Required to protect your account sign-in email.</p>
                  </div>
                ) : null}
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={closeEditor} className="min-h-12 rounded-xl px-5 font-semibold hover:bg-black/[0.06]">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveField}
                    disabled={isPending || (emailRequiresReauth && !currentPassword)}
                    className="min-h-12 rounded-xl bg-[#222] px-6 font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/25"
                  >
                    {isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
