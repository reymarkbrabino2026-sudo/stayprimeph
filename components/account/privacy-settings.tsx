"use client";

import { Check, ChevronRight, LockKeyhole, X } from "lucide-react";
import { useState, useTransition } from "react";
import { requestAccountDeletionAction, requestUserDataExportAction, savePrivacySettingsAction } from "@/app/account-settings/actions";
import type { PrivacySettingId, PrivacySettingsState } from "@/lib/account-settings-types";

type PanelId = "blocked" | "data" | "delete";

type Setting = {
  id: PrivacySettingId;
  title: string;
  body?: string;
  defaultChecked?: boolean;
};

const sections: Array<{ title: string; intro?: string; settings?: Setting[]; actions?: Array<{ id: PanelId; title: string; boxed?: boolean }> }> = [
  {
    title: "Messages",
    settings: [{ id: "readReceipts", title: "Show people when I've read their messages. Learn more", defaultChecked: true }],
    actions: [{ id: "blocked", title: "Blocked people" }],
  },
  {
    title: "Listings",
    settings: [
      {
        id: "searchEngines",
        title: "Include my listing(s) in search engines",
        body: "Turning this on means search engines, like Google, will display your listing page(s) in search results.",
      },
    ],
  },
  {
    title: "Reviews",
    intro: "Choose what's shared when you write a review. Updating this setting will change what's displayed for all past reviews. Learn more",
    settings: [
      { id: "homeCity", title: "Show my home city and country", body: "Ex: City and country" },
      { id: "tripType", title: "Show my trip type", body: "Ex: Stayed with kids or pets" },
      { id: "lengthOfStay", title: "Show my length of stay", body: "Ex: A few nights, about a week, etc.", defaultChecked: true },
      { id: "bookedServices", title: "Show my booked services", body: "Ex: Gourmet brunch or tasting menu" },
    ],
  },
  {
    title: "Data privacy",
    settings: [
      {
        id: "aiFeatures",
        title: "Help improve AI-powered features",
        body: "When this is on, we use your data to develop and improve AI models that power certain features on StayPrimePH. Learn more",
        defaultChecked: true,
      },
    ],
    actions: [
      { id: "data", title: "Request my personal data", boxed: true },
      { id: "delete", title: "Delete my account", boxed: true },
    ],
  },
];

export function PrivacySettings({ initialState }: { initialState: PrivacySettingsState }) {
  const [privacy, setPrivacy] = useState(initialState);
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [blockedInput, setBlockedInput] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function save(next: PrivacySettingsState, onSaved?: (saved: PrivacySettingsState) => void) {
    setPrivacy(next);
    setMessage("");
    startTransition(async () => {
      const result = await savePrivacySettingsAction(next);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setPrivacy(result.data);
      setMessage("Saved.");
      onSaved?.(result.data);
    });
  }

  function toggleSetting(id: PrivacySettingId) {
    save({ ...privacy, settings: { ...privacy.settings, [id]: !privacy.settings[id] } });
  }

  function addBlockedPerson() {
    const value = blockedInput.trim();
    if (!value || privacy.blockedPeople.some((person) => person.toLowerCase() === value.toLowerCase())) return;
    save({ ...privacy, blockedPeople: [...privacy.blockedPeople, value] });
    setBlockedInput("");
  }

  function removeBlockedPerson(person: string) {
    save({ ...privacy, blockedPeople: privacy.blockedPeople.filter((item) => item !== person) });
  }

  function requestDataExport() {
    setMessage("");
    startTransition(async () => {
      const result = await requestUserDataExportAction();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      const blob = new Blob([JSON.stringify(result.data.data, null, 2)], { type: result.data.contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      link.click();
      URL.revokeObjectURL(url);
      setPrivacy((current) => ({ ...current, dataRequestedAt: result.data.data.generatedAt }));
      setMessage("Your data export is ready.");
    });
  }

  function requestAccountDeletion() {
    if (deleteConfirmation !== "DELETE") return;
    setMessage("");
    startTransition(async () => {
      const result = await requestAccountDeletionAction();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setPrivacy((current) => ({ ...current, deletionRequestedAt: result.data.requestedAt, deletionVerifiedAt: null }));
      setDeleteConfirmation("");
      setMessage("Check your email to verify this deletion request.");
    });
  }

  return (
    <div>
      {message ? <p className="mb-2 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
      {sections.map((section) => (
        <section key={section.title} className="mt-10 border-b border-black/10 pb-6">
          <h3 className="text-2xl font-semibold">{section.title}</h3>
          {section.intro ? <p className="mt-2 text-sm text-black/65">{section.intro}</p> : null}
          <div className="mt-5 space-y-5">
            {section.settings?.map((setting) => (
              <ToggleRow key={setting.id} setting={setting} checked={privacy.settings[setting.id]} disabled={isPending} onToggle={() => toggleSetting(setting.id)} />
            ))}
            {section.actions?.map((action) => (
              <ActionRow
                key={action.id}
                title={action.title}
                boxed={action.boxed}
                open={openPanel === action.id}
                onClick={() => setOpenPanel((current) => (current === action.id ? null : action.id))}
              >
                {action.id === "blocked" ? (
                  <BlockedPeoplePanel
                    people={privacy.blockedPeople}
                    input={blockedInput}
                    onInput={setBlockedInput}
                    onAdd={addBlockedPerson}
                    onRemove={removeBlockedPerson}
                  />
                ) : null}
                {action.id === "data" ? <DataRequestPanel requestedAt={privacy.dataRequestedAt} disabled={isPending} onRequest={requestDataExport} /> : null}
                {action.id === "delete" ? (
                  <DeleteAccountPanel
                    requestedAt={privacy.deletionRequestedAt}
                    verifiedAt={privacy.deletionVerifiedAt}
                    confirmation={deleteConfirmation}
                    onConfirmation={setDeleteConfirmation}
                    disabled={isPending}
                    onRequest={requestAccountDeletion}
                  />
                ) : null}
              </ActionRow>
            ))}
            {section.title === "Data privacy" ? (
              <div className="mt-4 flex gap-5 rounded-2xl border border-black/15 p-6">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#083f35] text-[#083f35]">
                  <LockKeyhole size={22} />
                </div>
                <p>
                  <strong>Committed to privacy</strong>
                  <br />
                  <span className="text-sm text-black/65">StayPrimePH is committed to keeping your data protected. See details in our Privacy Policy.</span>
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

function ToggleRow({ setting, checked, disabled, onToggle }: { setting: Setting; checked: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={onToggle} className="flex min-h-16 w-full items-center justify-between gap-8 text-left disabled:cursor-not-allowed disabled:opacity-60">
      <span>
        <span className="block font-semibold">{setting.title}</span>
        {setting.body ? <span className="mt-1 block text-sm text-black/65">{setting.body}</span> : null}
      </span>
      <span className={`relative inline-flex h-8 w-12 shrink-0 items-center rounded-full transition ${checked ? "bg-[#222]" : "bg-black/45"}`}>
        <span className={`grid size-7 place-items-center rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0.5"}`}>
          {checked ? <Check size={15} strokeWidth={2.4} /> : null}
        </span>
      </span>
    </button>
  );
}

function ActionRow({
  title,
  boxed,
  open,
  onClick,
  children,
}: {
  title: string;
  boxed?: boolean;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={onClick}
        className={`flex min-h-14 w-full items-center justify-between text-left font-semibold transition hover:bg-black/[0.04] ${boxed ? "rounded-2xl border border-black/15 px-4" : ""}`}
      >
        {title}
        <ChevronRight size={20} className={`transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open ? <div className="mt-3 rounded-2xl border border-black/10 bg-black/[0.02] p-4">{children}</div> : null}
    </div>
  );
}

function BlockedPeoplePanel({
  people,
  input,
  onInput,
  onAdd,
  onRemove,
}: {
  people: string[];
  input: string;
  onInput: (value: string) => void;
  onAdd: () => void;
  onRemove: (person: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-black/65">People you block cannot send you messages on StayPrimePH.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={input}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder="Email or name"
          className="min-h-12 flex-1 rounded-xl border border-black/15 px-4 outline-none focus:border-[#083f35]"
        />
        <button type="button" onClick={onAdd} className="min-h-12 rounded-xl bg-[#222] px-5 font-semibold text-white">
          Block
        </button>
      </div>
      {people.length > 0 ? (
        <div className="space-y-2">
          {people.map((person) => (
            <div key={person} className="flex min-h-12 items-center justify-between rounded-xl bg-white px-4">
              <span className="font-medium">{person}</span>
              <button type="button" onClick={() => onRemove(person)} className="grid size-9 place-items-center rounded-full hover:bg-black/[0.06]" aria-label={`Unblock ${person}`}>
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-white p-4 text-sm text-black/65">No blocked people yet.</p>
      )}
    </div>
  );
}

function DataRequestPanel({ requestedAt, disabled, onRequest }: { requestedAt: string | null; disabled: boolean; onRequest: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-black/65">Download a JSON copy of the account, bookings, messages, listings, payments, support records, and settings associated with your StayPrimePH account.</p>
      {requestedAt ? <p className="rounded-xl bg-white p-4 text-sm font-medium">Last requested {new Date(requestedAt).toLocaleString()}</p> : null}
      <button type="button" onClick={onRequest} disabled={disabled} className="min-h-12 rounded-xl bg-[#222] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/25">
        {disabled ? "Saving..." : "Request data export"}
      </button>
    </div>
  );
}

function DeleteAccountPanel({
  requestedAt,
  verifiedAt,
  confirmation,
  onConfirmation,
  disabled,
  onRequest,
}: {
  requestedAt: string | null;
  verifiedAt: string | null;
  confirmation: string;
  onConfirmation: (value: string) => void;
  disabled: boolean;
  onRequest: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-black/65">Type DELETE to request account deletion or anonymization. We will email you a verification link before an admin can process the request. Verified requests are targeted for completion within 30 days unless active bookings, payment review, safety issues, disputes, accounting duties, or legal holds require more time.</p>
      {requestedAt ? <p className="rounded-xl bg-white p-4 text-sm font-medium">{verifiedAt ? `Deletion request verified ${new Date(verifiedAt).toLocaleString()}` : `Verification email sent ${new Date(requestedAt).toLocaleString()}`}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={confirmation}
          onChange={(event) => onConfirmation(event.target.value)}
          placeholder="Type DELETE"
          className="min-h-12 flex-1 rounded-xl border border-black/15 px-4 outline-none focus:border-[#083f35]"
        />
        <button
          type="button"
          onClick={onRequest}
          disabled={disabled || confirmation !== "DELETE"}
          className="min-h-12 rounded-xl bg-[#222] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/25"
        >
          {disabled ? "Saving..." : "Email verification link"}
        </button>
      </div>
    </div>
  );
}
