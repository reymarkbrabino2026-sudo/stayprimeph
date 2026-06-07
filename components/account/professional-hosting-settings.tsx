"use client";

import Link from "next/link";
import { BarChart3, Check, ClipboardCheck, Download, Settings2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveProfessionalHostingToolsAction } from "@/app/account-settings/actions";
import { defaultProfessionalHostingTools, type ProfessionalHostingToolId, type ProfessionalHostingToolState } from "@/lib/account-settings-types";

type CardId = "checklist" | "insights" | "controls";

const tools: Array<{ id: ProfessionalHostingToolId; title: string; body: string }> = [
  { id: "professionalTools", title: "Professional tools", body: "Access advanced hosting settings, listing tools, and performance views." },
  { id: "ruleSets", title: "Rule sets", body: "Create pricing and availability rules for selected nights." },
  { id: "bulkEditing", title: "Bulk editing", body: "Update listing details, prices, and availability faster across multiple spaces." },
];

const cards: Array<{ id: CardId; title: string; body: string; icon: React.ReactNode }> = [
  { id: "checklist", title: "Checklist", body: "Finish required listing details.", icon: <ClipboardCheck size={24} /> },
  { id: "insights", title: "Insights", body: "Track views and booking interest.", icon: <BarChart3 size={24} /> },
  { id: "controls", title: "Controls", body: "Tune prices and availability.", icon: <Settings2 size={24} /> },
];

export function ProfessionalHostingSettings({ initialSettings }: { initialSettings: ProfessionalHostingToolState }) {
  const [settings, setSettings] = useState(initialSettings);
  const [openCard, setOpenCard] = useState<CardId | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeTools = useMemo(() => tools.filter((tool) => settings[tool.id]), [settings]);
  const hostingHref = settings.professionalTools ? "/host/dashboard" : "/become-a-host/upgrade";

  function save(next: ProfessionalHostingToolState) {
    setSettings(next);
    setMessage("");
    startTransition(async () => {
      const result = await saveProfessionalHostingToolsAction(next);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setSettings(result.data);
      setMessage("Saved.");
    });
  }

  function toggleTool(id: ProfessionalHostingToolId) {
    const next = { ...settings, [id]: !settings[id] };
    if (id === "professionalTools" && settings.professionalTools) {
      next.ruleSets = false;
      next.bulkEditing = false;
    }
    if ((id === "ruleSets" || id === "bulkEditing") && !settings[id]) {
      next.professionalTools = true;
    }
    save(next);
  }

  function resetDefaults() {
    save(defaultProfessionalHostingTools);
    setOpenCard(null);
  }

  function downloadConfig() {
    const payload = {
      enabledTools: activeTools.map((tool) => tool.title),
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stayprimeph-professional-hosting-tools.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mt-8">
        {message ? <p className="mb-2 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
        {tools.map((tool) => {
          const checked = settings[tool.id];
          return (
            <button
              key={tool.id}
              type="button"
              role="switch"
              aria-checked={checked}
              disabled={isPending}
              onClick={() => toggleTool(tool.id)}
              className="grid w-full grid-cols-[1fr_auto] gap-6 border-b border-black/10 py-6 text-left disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>
                <span className="block font-semibold">{tool.title}</span>
                <span className="mt-1 block text-sm text-black/65">{tool.body}</span>
              </span>
              <span className={`relative inline-flex h-8 w-12 shrink-0 items-center rounded-full transition ${checked ? "bg-[#222]" : "bg-black/45"}`}>
                <span className={`grid size-7 place-items-center rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0.5"}`}>
                  {checked ? <Check size={15} strokeWidth={2.4} /> : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            aria-expanded={openCard === card.id}
            onClick={() => setOpenCard((current) => (current === card.id ? null : card.id))}
            className={`rounded-2xl border p-5 text-left transition hover:border-[#083f35] hover:bg-[#f4fbf8] ${openCard === card.id ? "border-[#083f35] bg-[#f4fbf8]" : "border-black/15"}`}
          >
            {card.icon}
            <h3 className="mt-4 font-semibold">{card.title}</h3>
            <p className="mt-1 text-sm text-black/65">{card.body}</p>
          </button>
        ))}
      </div>

      {openCard ? (
        <div className="mt-5 rounded-2xl border border-black/15 bg-black/[0.02] p-5">
          {openCard === "checklist" ? <ChecklistPanel settings={settings} /> : null}
          {openCard === "insights" ? <InsightsPanel /> : null}
          {openCard === "controls" ? <ControlsPanel settings={settings} /> : null}
        </div>
      ) : null}

      <div className="mt-8 rounded-2xl border border-black/15 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Enabled tools</h3>
            <p className="mt-2 text-sm text-black/65">{activeTools.length > 0 ? activeTools.map((tool) => tool.title).join(", ") : "No professional tools enabled."}</p>
          </div>
          <button type="button" onClick={resetDefaults} disabled={isPending} className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60">
            Reset
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={hostingHref} className="inline-flex min-h-12 items-center rounded-xl bg-[#222] px-6 font-semibold text-white">
            Go to hosting
          </Link>
          <button type="button" onClick={downloadConfig} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-black/15 px-6 font-semibold transition hover:border-black">
            <Download size={18} />
            Export settings
          </button>
        </div>
      </div>
    </>
  );
}

function ChecklistPanel({ settings }: { settings: ProfessionalHostingToolState }) {
  const items = [
    { label: "Professional tools enabled", done: settings.professionalTools },
    { label: "Rule sets available for calendar pricing", done: settings.ruleSets },
    { label: "Bulk editing enabled for multiple listings", done: settings.bulkEditing },
    { label: "Hosting dashboard ready", done: true },
  ];

  return (
    <div>
      <h3 className="font-semibold">Hosting checklist</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl bg-white p-4">
            <span>{item.label}</span>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${item.done ? "bg-[#eef8f4] text-[#083f35]" : "bg-black/[0.06] text-black/60"}`}>{item.done ? "Ready" : "Off"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsPanel() {
  const metrics = [
    { label: "Views this week", value: "128" },
    { label: "Booking interest", value: "14 requests" },
    { label: "Average nightly rate", value: "PHP 2,800" },
  ];

  return (
    <div>
      <h3 className="font-semibold">Performance insights</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl bg-white p-4">
            <p className="text-sm text-black/60">{metric.label}</p>
            <p className="mt-1 text-xl font-semibold">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ControlsPanel({ settings }: { settings: ProfessionalHostingToolState }) {
  return (
    <div>
      <h3 className="font-semibold">Hosting controls</h3>
      <div className="mt-4 grid gap-3">
        <ControlRow label="Pricing rules" enabled={settings.ruleSets} />
        <ControlRow label="Availability rules" enabled={settings.ruleSets} />
        <ControlRow label="Bulk listing updates" enabled={settings.bulkEditing} />
      </div>
    </div>
  );
}

function ControlRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white p-4">
      <span>{label}</span>
      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${enabled ? "bg-[#eef8f4] text-[#083f35]" : "bg-black/[0.06] text-black/60"}`}>{enabled ? "Enabled" : "Turn on required tool"}</span>
    </div>
  );
}
