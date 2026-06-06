"use client";

import { Banknote, ChevronRight, Download, Landmark, WalletCards, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocalStorageState } from "@/lib/use-local-storage-state";

type PayoutMethod = {
  id: string;
  type: "Bank account" | "PayPal" | "GCash";
  accountName: string;
  bankName: string;
  accountLast4: string;
  currency: string;
};

type PayoutRecord = {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "Scheduled" | "Sent" | "Processing";
};

const methodsKey = "stayprimeph:payout-methods:v1";
const emptyMethods: PayoutMethod[] = [];

const payoutRecords: PayoutRecord[] = [
  { id: "PO-2041", date: "2026-05-27", description: "May hosting payout", amount: 12850, status: "Scheduled" },
  { id: "PO-1988", date: "2026-04-30", description: "April hosting payout", amount: 9340, status: "Sent" },
  { id: "PO-1902", date: "2026-03-30", description: "March hosting payout", amount: 7825, status: "Sent" },
];

const emptyMethod: Omit<PayoutMethod, "id"> = {
  type: "Bank account",
  accountName: "",
  bankName: "",
  accountLast4: "",
  currency: "PHP",
};

function deserializeMethods(value: string) {
  return JSON.parse(value) as PayoutMethod[];
}

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

export function PayoutSettings() {
  const [methods, setMethods] = useLocalStorageState(methodsKey, emptyMethods, { deserialize: deserializeMethods });
  const [draft, setDraft] = useState(emptyMethod);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<"method" | "timing" | "how" | "history" | null>(null);

  const totals = useMemo(() => {
    const sent = payoutRecords.filter((item) => item.status === "Sent").reduce((sum, item) => sum + item.amount, 0);
    const scheduled = payoutRecords.filter((item) => item.status !== "Sent").reduce((sum, item) => sum + item.amount, 0);
    return { sent, scheduled };
  }, []);

  function saveMethods(next: PayoutMethod[]) {
    setMethods(next);
  }

  function openMethodForm(method?: PayoutMethod) {
    setDraft(method ? { type: method.type, accountName: method.accountName, bankName: method.bankName, accountLast4: method.accountLast4, currency: method.currency } : emptyMethod);
    setEditingId(method?.id ?? null);
    setOpenPanel("method");
  }

  function saveMethod() {
    const nextMethod: PayoutMethod = {
      id: editingId ?? crypto.randomUUID(),
      type: draft.type,
      accountName: draft.accountName.trim(),
      bankName: draft.bankName.trim(),
      accountLast4: draft.accountLast4.replace(/\D/g, "").slice(-4),
      currency: draft.currency.trim().toUpperCase() || "PHP",
    };
    const next = editingId ? methods.map((method) => (method.id === editingId ? nextMethod : method)) : [...methods, nextMethod];
    saveMethods(next);
    setDraft(emptyMethod);
    setEditingId(null);
    setOpenPanel(null);
  }

  function exportHistory() {
    const blob = new Blob([JSON.stringify(payoutRecords, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stayprimeph-payout-history.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="mt-9">
        <h3 className="text-3xl font-semibold">How you&apos;ll get paid</h3>
        <p className="mt-2">Add at least one payout method so we know where to send your money.</p>
        {methods.length > 0 ? (
          <div className="mt-7 space-y-3">
            {methods.map((method) => (
              <SavedMethod
                key={method.id}
                method={method}
                onEdit={() => openMethodForm(method)}
                onRemove={() => saveMethods(methods.filter((item) => item.id !== method.id))}
              />
            ))}
          </div>
        ) : null}
        <PrimaryButton onClick={() => openMethodForm()}>{methods.length > 0 ? "Add another payout method" : "Set up payouts"}</PrimaryButton>
        {openPanel === "method" ? (
          <Panel title={editingId ? "Edit payout method" : "Set up payouts"}>
            <label className="grid gap-2 font-semibold">
              <span>Payout type</span>
              <select
                value={draft.type}
                onChange={(event) => setDraft({ ...draft, type: event.target.value as PayoutMethod["type"] })}
                className="min-h-12 rounded-xl border border-black/15 bg-white px-4 font-normal outline-none transition focus:border-[#083f35]"
              >
                <option>Bank account</option>
                <option>PayPal</option>
                <option>GCash</option>
              </select>
            </label>
            <TextField label="Account holder name" value={draft.accountName} onChange={(value) => setDraft({ ...draft, accountName: value })} />
            <TextField label={draft.type === "Bank account" ? "Bank name" : "Provider email or mobile"} value={draft.bankName} onChange={(value) => setDraft({ ...draft, bankName: value })} />
            <TextField label="Last 4 digits" value={draft.accountLast4} onChange={(value) => setDraft({ ...draft, accountLast4: value.replace(/\D/g, "").slice(0, 4) })} />
            <TextField label="Currency" value={draft.currency} onChange={(value) => setDraft({ ...draft, currency: value })} />
            <FormActions onCancel={() => setOpenPanel(null)} onSave={saveMethod} disabled={!draft.accountName.trim() || !draft.bankName.trim() || draft.accountLast4.replace(/\D/g, "").length !== 4} />
          </Panel>
        ) : null}
      </section>

      <div className="mt-14 rounded-2xl border border-black/15 p-6">
        <h3 className="text-xl font-semibold">Need help?</h3>
        <HelpRow title="When you'll get your payout" open={openPanel === "timing"} onClick={() => setOpenPanel((current) => (current === "timing" ? null : "timing"))}>
          <p className="text-sm text-black/65">Payouts are usually released 24 hours after guest check-in. Bank processing can take 1 to 5 business days depending on the provider.</p>
        </HelpRow>
        <HelpRow title="How payouts work" open={openPanel === "how"} onClick={() => setOpenPanel((current) => (current === "how" ? null : "how"))}>
          <p className="text-sm text-black/65">StayPrimePH sends your earnings to the default payout method after fees, refunds, and adjustments are applied.</p>
        </HelpRow>
        <HelpRow title="Go to your transaction history" open={openPanel === "history"} onClick={() => setOpenPanel((current) => (current === "history" ? null : "history"))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryTile label="Sent" value={money(totals.sent)} />
            <SummaryTile label="Scheduled" value={money(totals.scheduled)} />
          </div>
          <div className="mt-4 space-y-3">
            {payoutRecords.map((record) => (
              <div key={record.id} className="grid gap-2 rounded-xl bg-white p-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{record.description}</p>
                  <p className="mt-1 text-sm text-black/60">
                    {record.id} - {new Date(record.date).toLocaleDateString()} - {record.status}
                  </p>
                </div>
                <p className="font-semibold">{money(record.amount)}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={exportHistory} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/15 px-5 font-semibold transition hover:border-black">
            <Download size={18} />
            Download history
          </button>
        </HelpRow>
      </div>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-black/15 bg-black/[0.02] p-5">
      <h4 className="text-lg font-semibold">{title}</h4>
      <div className="mt-4 grid gap-4">{children}</div>
    </div>
  );
}

function SavedMethod({ method, onEdit, onRemove }: { method: PayoutMethod; onEdit: () => void; onRemove: () => void }) {
  const Icon = method.type === "Bank account" ? Landmark : method.type === "PayPal" ? WalletCards : Banknote;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/15 p-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef8f4] text-[#083f35]">
          <Icon size={21} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{method.type} ending in {method.accountLast4}</p>
          <p className="mt-1 truncate text-sm text-black/60">{method.accountName} - {method.bankName} - {method.currency}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:border-black">
          Edit
        </button>
        <button type="button" onClick={onRemove} className="grid size-10 place-items-center rounded-full transition hover:bg-black/[0.06]" aria-label={`Remove ${method.type} ending in ${method.accountLast4}`}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

function HelpRow({ title, open, onClick, children }: { title: string; open: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="border-t border-black/10 first:mt-4">
      <button type="button" aria-expanded={open} onClick={onClick} className="flex min-h-14 w-full items-center justify-between py-4 text-left font-semibold underline">
        {title}
        <ChevronRight className={`transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open ? <div className="rounded-2xl bg-black/[0.02] p-4">{children}</div> : null}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-sm text-black/60">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
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

function FormActions({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      <button type="button" onClick={onSave} disabled={disabled} className="min-h-11 rounded-xl bg-[#222] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/25">
        Save
      </button>
      <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-black/15 px-5 font-semibold transition hover:border-black">
        Cancel
      </button>
    </div>
  );
}
