"use client";

import { useMemo, useState } from "react";

type PreferenceGroup = {
  title: string;
  intro: string;
  items: string[];
};

type Channels = {
  email: boolean;
  push: boolean;
  sms: boolean;
};

const channelLabels: Array<{ key: keyof Channels; label: string; description: string }> = [
  { key: "email", label: "Email", description: "Send updates to your account email." },
  { key: "push", label: "Push", description: "Show updates in the app and browser." },
  { key: "sms", label: "Text message", description: "Send urgent updates by SMS when available." },
];

function preferenceId(groupTitle: string, item: string) {
  return `${groupTitle}:${item}`;
}

function initialChannels(defaultOn: boolean): Channels {
  return { email: defaultOn, push: defaultOn, sms: false };
}

function summarizeChannels(channels: Channels) {
  const active = channelLabels.filter(({ key }) => channels[key]).map(({ label }) => label);
  return active.length > 0 ? active.join(" and ") : "Off";
}

export function NotificationPreferences({
  groups,
  storageKey,
  defaultOn = false,
  showMarketingUnsubscribe = false,
}: {
  groups: PreferenceGroup[];
  storageKey: string;
  defaultOn?: boolean;
  showMarketingUnsubscribe?: boolean;
}) {
  const defaults = useMemo(() => {
    return Object.fromEntries(
      groups.flatMap((group) =>
        group.items.map((item) => [preferenceId(group.title, item), initialChannels(defaultOn)]),
      ),
    ) as Record<string, Channels>;
  }, [defaultOn, groups]);

  const [preferences, setPreferences] = useState<Record<string, Channels>>(() => {
    if (typeof window === "undefined") return defaults;

    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ? { ...defaults, ...(JSON.parse(stored) as Record<string, Channels>) } : defaults;
    } catch {
      return defaults;
    }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Channels | null>(null);
  const [unsubscribed, setUnsubscribed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(`${storageKey}:unsubscribed`) === "true";
  });

  function savePreferences(next: Record<string, Channels>) {
    setPreferences(next);
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function startEditing(id: string) {
    setEditingId(id);
    setDraft({ ...(preferences[id] ?? initialChannels(defaultOn)) });
  }

  function cancelEditing() {
    setEditingId(null);
    setDraft(null);
  }

  function saveDraft(id: string) {
    if (!draft) return;
    savePreferences({ ...preferences, [id]: draft });
    setEditingId(null);
    setDraft(null);
  }

  function toggleUnsubscribe() {
    const nextUnsubscribed = !unsubscribed;
    setUnsubscribed(nextUnsubscribed);
    if (typeof window !== "undefined") window.localStorage.setItem(`${storageKey}:unsubscribed`, String(nextUnsubscribed));
    if (!nextUnsubscribed) return;

    const next = Object.fromEntries(
      Object.keys(preferences).map((id) => [id, initialChannels(false)]),
    ) as Record<string, Channels>;
    savePreferences(next);
  }

  return (
    <div>
      {groups.map((group) => (
        <section key={group.title} className="border-b border-black/10 py-7">
          <h3 className="text-2xl font-semibold">{group.title}</h3>
          <p className="mt-2 text-sm text-black/65">{group.intro}</p>
          <div className="mt-6 space-y-5">
            {group.items.map((item) => {
              const id = preferenceId(group.title, item);
              const channels = preferences[id] ?? initialChannels(defaultOn);
              const editing = editingId === id;

              return (
                <div key={id} className={`rounded-2xl border p-4 transition ${editing ? "border-[#083f35] bg-[#f4fbf8]" : "border-transparent hover:border-black/10 hover:bg-black/[0.02]"}`}>
                  <div className="grid grid-cols-[1fr_auto] items-start gap-6">
                    <div>
                      <h4 className="font-medium">{item}</h4>
                      <p className="mt-1 text-sm text-black/65">{summarizeChannels(channels)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditing(id)}
                      className={`min-h-10 rounded-full px-5 text-sm font-semibold transition ${editing ? "bg-[#083f35] text-white" : "border border-black/15 hover:border-black"}`}
                    >
                      {editing ? "Editing" : "Edit"}
                    </button>
                  </div>
                    {editing && draft ? (
                      <div className="mt-4 space-y-3 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
                        {channelLabels.map(({ key, label, description }) => (
                          <label key={key} className="grid min-h-14 cursor-pointer grid-cols-[1fr_auto] gap-5 rounded-xl bg-white p-3 transition hover:bg-black/[0.03]">
                            <span>
                              <span className="block font-semibold">{label}</span>
                              <span className="mt-1 block text-sm text-black/60">{description}</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={draft[key]}
                              onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })}
                              className="mt-1 size-5 accent-[#083f35]"
                            />
                          </label>
                        ))}
                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => saveDraft(id)} className="rounded-full bg-[#222] px-5 py-2 text-sm font-semibold text-white">
                            Save
                          </button>
                          <button type="button" onClick={cancelEditing} className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {showMarketingUnsubscribe ? (
        <label className="mt-7 flex cursor-pointer items-center gap-4 font-semibold">
          <input type="checkbox" checked={unsubscribed} onChange={toggleUnsubscribe} className="size-6 accent-[#222]" />
          Unsubscribe from all marketing emails
        </label>
      ) : null}
    </div>
  );
}
