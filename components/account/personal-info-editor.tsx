"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type FieldKey =
  | "legalName"
  | "preferredName"
  | "email"
  | "phone"
  | "identity"
  | "residentialAddress"
  | "mailingAddress"
  | "emergencyContact";

type ProfileState = Record<FieldKey, string>;

const fieldMeta: Array<{
  key: FieldKey;
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

function storageKey(userId: string) {
  return `stayprimeph-account-profile:${userId}`;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name.charAt(0)}***${name.slice(-1)}@${domain}`;
}

function initialProfile(user: SessionUser): ProfileState {
  return {
    legalName: user.name,
    preferredName: "",
    email: user.email,
    phone: user.phone,
    identity: "",
    residentialAddress: "Provided",
    mailingAddress: "",
    emergencyContact: "",
  };
}

function displayValue(key: FieldKey, value: string) {
  if (!value) {
    if (key === "phone") return "Add a number so confirmed guests and StayPrimePH can get in touch. You can add other numbers and choose how they're used.";
    if (key === "identity") return "Not started";
    return "Not provided";
  }

  if (key === "email") return maskEmail(value);
  return value;
}

export function PersonalInfoEditor({ user }: { user: SessionUser }) {
  const defaults = useMemo(() => initialProfile(user), [user]);
  const [profile, setProfile] = useState<ProfileState>(defaults);
  const [activeField, setActiveField] = useState<FieldKey | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const activeMeta = fieldMeta.find((item) => item.key === activeField);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(storageKey(user.id));
        if (stored) setProfile({ ...defaults, ...(JSON.parse(stored) as Partial<ProfileState>) });
      } catch {
        setProfile(defaults);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [defaults, user.id]);

  function openEditor(key: FieldKey) {
    setActiveField(key);
    setDraftValue(profile[key]);
  }

  function closeEditor() {
    setActiveField(null);
    setDraftValue("");
  }

  function saveField() {
    if (!activeField) return;
    const nextProfile = { ...profile, [activeField]: draftValue.trim() };
    setProfile(nextProfile);
    window.localStorage.setItem(storageKey(user.id), JSON.stringify(nextProfile));
    closeEditor();
  }

  function startVerification() {
    const nextProfile = { ...profile, identity: "Verification started" };
    setProfile(nextProfile);
    window.localStorage.setItem(storageKey(user.id), JSON.stringify(nextProfile));
    closeEditor();
  }

  return (
    <>
      <div className="mt-5">
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
                <button type="button" onClick={startVerification} className="mt-6 min-h-12 rounded-xl bg-[#222] px-6 font-semibold text-white">
                  Start verification
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
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={closeEditor} className="min-h-12 rounded-xl px-5 font-semibold hover:bg-black/[0.06]">
                    Cancel
                  </button>
                  <button type="button" onClick={saveField} className="min-h-12 rounded-xl bg-[#222] px-6 font-semibold text-white">
                    Save
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
