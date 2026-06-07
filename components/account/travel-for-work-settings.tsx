"use client";

import { Building2, Check, Download, Mail, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveWorkTravelProfileAction } from "@/app/account-settings/actions";
import { defaultWorkTravelProfile, type WorkTravelProfile } from "@/lib/account-settings-types";

function companyFromEmail(email: string) {
  const domain = email.split("@")[1]?.split(".")[0] ?? "";
  if (!domain) return "";
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

export function TravelForWorkSettings({ initialProfile }: { initialProfile: WorkTravelProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(defaultWorkTravelProfile);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasWorkEmail = profile.email.trim().length > 0;
  const receiptPreview = useMemo(() => {
    return {
      company: profile.companyName || companyFromEmail(profile.email) || "Your company",
      email: profile.email || "work@example.com",
      department: profile.department || "Not set",
      employeeId: profile.employeeId || "Not set",
    };
  }, [profile]);

  function openForm() {
    setDraft(profile.email ? profile : { ...profile, companyName: companyFromEmail(profile.email) });
    setEditing(true);
  }

  function saveProfile() {
    const normalizedEmail = draft.email.trim().toLowerCase();
    const next = {
      ...draft,
      email: normalizedEmail,
      companyName: draft.companyName.trim() || companyFromEmail(normalizedEmail),
      department: draft.department.trim(),
      employeeId: draft.employeeId.trim(),
      verified: true,
    };
    save(next, () => {
      setDraft(next);
      setEditing(false);
    });
  }

  function removeProfile() {
    save(defaultWorkTravelProfile, () => {
      setDraft(defaultWorkTravelProfile);
      setEditing(false);
    });
  }

  function toggleReceipts() {
    const next = { ...profile, includeBusinessReceipts: !profile.includeBusinessReceipts };
    save(next, () => setDraft(next));
  }

  function save(next: WorkTravelProfile, onSaved?: () => void) {
    setProfile(next);
    setMessage("");
    startTransition(async () => {
      const result = await saveWorkTravelProfileAction(next);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setProfile(result.data);
      setMessage("Saved.");
      onSaved?.();
    });
  }

  function downloadReceiptSample() {
    const payload = {
      receiptType: "Business trip receipt",
      company: receiptPreview.company,
      workEmail: receiptPreview.email,
      department: receiptPreview.department,
      employeeId: receiptPreview.employeeId,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stayprimeph-business-receipt-sample.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="mt-10 border-b border-black/10 pb-8">
        {message ? <p className="mb-4 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
        <div className="flex gap-5">
          <Building2 size={34} strokeWidth={1.7} />
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">{hasWorkEmail ? "Work travel profile" : "Add your work email"}</h3>
                <p className="mt-2 text-black/65">Use a company email to unlock work trip tools and separate business travel from personal stays.</p>
              </div>
              {hasWorkEmail ? (
                <button type="button" onClick={openForm} disabled={isPending} className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60">
                  Edit
                </button>
              ) : null}
            </div>

            {hasWorkEmail ? (
              <div className="mt-6 rounded-2xl border border-black/15 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{profile.email}</p>
                    <p className="mt-1 text-sm text-black/65">{profile.companyName || companyFromEmail(profile.email)}</p>
                    <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#eef8f4] px-3 py-1 text-sm font-semibold text-[#083f35]">
                      <Check size={15} />
                      Verified for work travel
                    </p>
                  </div>
                  <button type="button" onClick={removeProfile} disabled={isPending} className="grid size-10 place-items-center rounded-full transition hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-60" aria-label="Remove work email">
                    <X size={18} />
                  </button>
                </div>
                <div className="mt-5 grid gap-3 text-sm text-black/65 sm:grid-cols-2">
                  <SummaryTile label="Department" value={profile.department || "Not set"} />
                  <SummaryTile label="Employee ID" value={profile.employeeId || "Not set"} />
                </div>
              </div>
            ) : (
              <PrimaryButton onClick={openForm}>Add work email</PrimaryButton>
            )}

            {editing ? (
              <FormPanel title={hasWorkEmail ? "Edit work travel details" : "Add work email"}>
                <TextField label="Work email" value={draft.email} onChange={(value) => setDraft({ ...draft, email: value, companyName: draft.companyName || companyFromEmail(value) })} />
                <TextField label="Company name" value={draft.companyName} onChange={(value) => setDraft({ ...draft, companyName: value })} />
                <TextField label="Department" value={draft.department} onChange={(value) => setDraft({ ...draft, department: value })} />
                <TextField label="Employee ID" value={draft.employeeId} onChange={(value) => setDraft({ ...draft, employeeId: value })} />
                <div className="flex flex-wrap gap-3 pt-1">
                  <button type="button" onClick={saveProfile} disabled={isPending || !draft.email.includes("@") || draft.email.endsWith("@")} className="min-h-11 rounded-xl bg-[#222] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/25">
                    {isPending ? "Saving..." : "Save"}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-xl border border-black/15 px-5 font-semibold transition hover:border-black">
                    Cancel
                  </button>
                </div>
              </FormPanel>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-black/15 p-6">
        <div className="flex gap-5">
          <Mail className="text-[#083f35]" size={30} strokeWidth={1.7} />
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">Business receipts</h3>
                <p className="mt-2 text-sm text-black/65">
                  {hasWorkEmail
                    ? "Eligible trip receipts can include your saved business details for expense reports."
                    : "Once a work email is added, eligible trip receipts can include business details for expense reports."}
                </p>
              </div>
              <button type="button" role="switch" aria-checked={profile.includeBusinessReceipts && hasWorkEmail} disabled={isPending || !hasWorkEmail} onClick={toggleReceipts} className={`relative inline-flex h-8 w-12 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${profile.includeBusinessReceipts && hasWorkEmail ? "bg-[#222]" : "bg-black/45"}`}>
                <span className={`grid size-7 place-items-center rounded-full bg-white shadow transition ${profile.includeBusinessReceipts && hasWorkEmail ? "translate-x-4" : "translate-x-0.5"}`}>
                  {profile.includeBusinessReceipts && hasWorkEmail ? <Check size={15} strokeWidth={2.4} /> : null}
                </span>
              </button>
            </div>

            {hasWorkEmail ? (
              <div className="mt-5 rounded-2xl bg-black/[0.02] p-4">
                <h4 className="font-semibold">Receipt details</h4>
                <div className="mt-3 grid gap-3 text-sm text-black/65 sm:grid-cols-2">
                  <SummaryTile label="Company" value={receiptPreview.company} />
                  <SummaryTile label="Work email" value={receiptPreview.email} />
                  <SummaryTile label="Department" value={receiptPreview.department} />
                  <SummaryTile label="Employee ID" value={receiptPreview.employeeId} />
                </div>
                <button type="button" onClick={downloadReceiptSample} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/15 px-5 font-semibold transition hover:border-black">
                  <Download size={18} />
                  Download sample receipt
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-7 min-h-12 rounded-xl bg-[#222] px-6 font-semibold text-white transition hover:bg-black">
      {children}
    </button>
  );
}

function FormPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-black/15 bg-black/[0.02] p-5">
      <h4 className="text-lg font-semibold">{title}</h4>
      <div className="mt-4 grid gap-4">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 font-semibold">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-xl border border-black/15 bg-white px-4 font-normal outline-none transition focus:border-[#083f35]"
      />
    </label>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="font-semibold text-black">{label}</p>
      <p className="mt-1 break-words">{value}</p>
    </div>
  );
}
