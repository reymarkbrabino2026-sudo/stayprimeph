"use client";

import { Banknote, ChevronRight, Download, Landmark, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveFinancialSettingsAction, verifyFinancialSettingsStepUpAction } from "@/app/account-settings/actions";
import { StepUpPasswordField } from "@/components/account/step-up-password-field";
import type { FinancialSettingsState, PayoutMethod } from "@/lib/account-settings-types";
import type { Payout } from "@/lib/types";

type PayoutHistoryRecord = Pick<Payout, "id" | "hostId" | "bookingId" | "paymentId" | "amount" | "status" | "availableOn" | "createdAt">;

const emptyMethod: Omit<PayoutMethod, "id"> = {
  type: "Bank account",
  accountName: "",
  bankName: "",
  accountNumber: "",
  currency: "PHP",
};

const bankProviders = ["BDO", "BPI", "Metrobank", "UnionBank", "Land Bank", "Security Bank", "RCBC", "PNB"];
const digitalWalletProviders = ["GCash", "Maya", "PayPal"];
const providerOptions = [...bankProviders, ...digitalWalletProviders];

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

function formatHistoryDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function payoutStatusLabel(status: PayoutHistoryRecord["status"]) {
  return status === "paid" ? "Sent" : "Scheduled";
}

function payoutDescription(record: PayoutHistoryRecord) {
  return record.bookingId ? `Booking transaction ${record.bookingId}` : "Host payout";
}

export function PayoutSettings({
  initialFinancial,
  requiresStepUp = false,
  hasPassword = true,
  userEmail,
  payouts = [],
}: {
  initialFinancial: FinancialSettingsState;
  requiresStepUp?: boolean;
  hasPassword?: boolean;
  userEmail?: string;
  payouts?: PayoutHistoryRecord[];
}) {
  const [financial, setFinancial] = useState(initialFinancial);
  const [draft, setDraft] = useState(emptyMethod);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<"method" | "timing" | "how" | "history" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const methods = financial.payoutMethods;
  const needsPasswordSetup = requiresStepUp && !hasPassword;
  const passwordHelpHref = `/forgot-password${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ""}`;

  const payoutHistory = useMemo(
    () => [...payouts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [payouts],
  );

  const totals = useMemo(() => {
    const sent = payoutHistory.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
    const scheduled = payoutHistory.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amount, 0);
    return { sent, scheduled };
  }, [payoutHistory]);

  function saveMethods(next: PayoutMethod[]) {
    if (needsPasswordSetup) {
      setMessage("Set a StayPrimePH password before changing payout settings.");
      setOpenPanel(null);
      return;
    }

    const nextFinancial = { ...financial, payoutMethods: next };
    const previous = financial;
    setFinancial(nextFinancial);
    setMessage("");
    startTransition(async () => {
      const result = await saveFinancialSettingsAction(nextFinancial, currentPassword);
      if (requiresStepUp) setCurrentPassword("");
      if (!result.ok) {
        setFinancial(previous);
        setMessage(result.error);
        return;
      }
      setFinancial(result.data);
      setMessage("Saved.");
    });
  }

  function showMethodForm(method?: PayoutMethod) {
    setDraft(method ? { type: method.type, accountName: method.accountName, bankName: method.bankName, accountNumber: method.accountNumber, currency: method.currency } : emptyMethod);
    setEditingId(method?.id ?? null);
    setOpenPanel("method");
  }

  function openMethodForm(method?: PayoutMethod) {
    if (isPending) return;

    setMessage("");

    if (!requiresStepUp) {
      showMethodForm(method);
      return;
    }

    if (needsPasswordSetup) {
      setMessage("Set a StayPrimePH password before setting up payouts.");
      setOpenPanel(null);
      return;
    }

    if (!currentPassword.trim()) {
      setMessage("Enter your current password before setting up payouts.");
      setOpenPanel(null);
      return;
    }

    startTransition(async () => {
      const result = await verifyFinancialSettingsStepUpAction(currentPassword);
      if (!result.ok) {
        setMessage(result.error);
        setCurrentPassword("");
        setOpenPanel(null);
        return;
      }

      showMethodForm(method);
    });
  }

  function updateProvider(provider: string) {
    const type: PayoutMethod["type"] = bankProviders.includes(provider) ? "Bank account" : provider === "Maya" ? "Maya" : provider === "PayPal" ? "PayPal" : provider === "GCash" ? "GCash" : "Digital wallet";
    setDraft({ ...draft, type, bankName: provider });
  }

  function saveMethod() {
    const nextMethod: PayoutMethod = {
      id: editingId ?? crypto.randomUUID(),
      type: draft.type,
      accountName: draft.accountName.trim(),
      bankName: draft.bankName.trim(),
      accountNumber: draft.accountNumber.trim(),
      currency: "PHP",
    };
    const next = editingId ? methods.map((method) => (method.id === editingId ? nextMethod : method)) : [...methods, nextMethod];
    saveMethods(next);
    setDraft(emptyMethod);
    setEditingId(null);
    setOpenPanel(null);
  }

  function exportHistory() {
    const blob = new Blob([JSON.stringify(payoutHistory, null, 2)], { type: "application/json" });
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
        {message ? <p className="mb-4 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
        <h3 className="break-words text-2xl font-semibold sm:text-3xl">How you&apos;ll get paid</h3>
        <p className="mt-2">Add at least one payout method so we know where to send your money.</p>
        {needsPasswordSetup ? (
          <div className="mt-5 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">This account uses Google sign-in.</p>
            <p className="mt-1 text-amber-900/80">StayPrimePH never receives your Gmail password. Set a StayPrimePH password first, then return here to add or change payout methods.</p>
            <Link href={passwordHelpHref} className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[#21170f] px-4 font-semibold text-white transition hover:bg-black">
              Set StayPrimePH password
            </Link>
          </div>
        ) : (
          <div className="mt-5 max-w-md">
            <StepUpPasswordField required={requiresStepUp} value={currentPassword} onChange={setCurrentPassword} resetHref={passwordHelpHref} />
          </div>
        )}
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
        <PrimaryButton onClick={() => openMethodForm()} disabled={isPending || needsPasswordSetup}>{methods.length > 0 ? "Add another payout method" : "Set up payouts"}</PrimaryButton>
        {openPanel === "method" ? (
          <Panel title={editingId ? "Edit payout method" : "Set up payouts"}>
            <label className="grid gap-2 font-semibold">
              <span>Bank or digital wallet</span>
              <select
                value={draft.bankName}
                onChange={(event) => updateProvider(event.target.value)}
                className="min-h-12 rounded-xl border border-black/15 bg-white px-4 font-normal outline-none transition focus:border-[#083f35]"
              >
                <option value="">Select a bank or wallet</option>
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
                {draft.bankName && !providerOptions.includes(draft.bankName) ? <option value={draft.bankName}>{draft.bankName}</option> : null}
              </select>
            </label>
            <TextField label="Account name" value={draft.accountName} onChange={(value) => setDraft({ ...draft, accountName: value })} />
            <TextField label="Account number" value={draft.accountNumber} onChange={(value) => setDraft({ ...draft, accountNumber: value })} />
            <ReadOnlyField label="Currency" value="PHP" />
            <FormActions onCancel={() => setOpenPanel(null)} onSave={saveMethod} disabled={isPending || !draft.accountName.trim() || !draft.bankName.trim() || !draft.accountNumber.trim()} />
          </Panel>
        ) : null}
      </section>

      <div className="mt-10 rounded-2xl border border-black/15 p-4 sm:mt-14 sm:p-6">
        <h3 className="text-xl font-semibold">Need help?</h3>
        <HelpRow title="When you'll get your payout" open={openPanel === "timing"} onClick={() => setOpenPanel((current) => (current === "timing" ? null : "timing"))}>
          <p className="text-sm text-black/65">Payouts are sent per paid booking transaction. StayPrimePH aims to send the host payout as soon as possible and within 24 hours after the guest payment is received and approved.</p>
        </HelpRow>
        <HelpRow title="How payouts work" open={openPanel === "how"} onClick={() => setOpenPanel((current) => (current === "how" ? null : "how"))}>
          <p className="text-sm text-black/65">The guest pays the booking total, StayPrimePH receives the payment, the 20% markup is added to the StayPrimePH balance, and the remaining host payout is sent to your saved payout method.</p>
        </HelpRow>
        <HelpRow title="Go to your transaction history" open={openPanel === "history"} onClick={() => setOpenPanel((current) => (current === "history" ? null : "history"))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryTile label="Sent" value={money(totals.sent)} />
            <SummaryTile label="Scheduled" value={money(totals.scheduled)} />
          </div>
          {payoutHistory.length > 0 ? (
            <div className="mt-4 space-y-3">
              {payoutHistory.map((record) => (
                <div key={record.id} className="grid min-w-0 gap-2 rounded-xl bg-white p-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold">{payoutDescription(record)}</p>
                    <p className="mt-1 break-all text-sm text-black/60">
                      {record.id} - {formatHistoryDate(record.status === "paid" ? record.createdAt : record.availableOn)} - {payoutStatusLabel(record.status)}
                    </p>
                    {record.paymentId ? <p className="mt-1 text-xs text-black/45">Payment {record.paymentId}</p> : null}
                  </div>
                  <p className="font-semibold">{money(record.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-white p-4 text-sm text-black/60">No payout transactions have been sent yet.</p>
          )}
          <button type="button" onClick={exportHistory} disabled={payoutHistory.length === 0} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/15 px-5 font-semibold transition hover:border-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            <Download size={18} />
            Download history
          </button>
        </HelpRow>
      </div>
    </>
  );
}

function PrimaryButton({ children, disabled = false, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="mt-7 min-h-12 w-full rounded-xl bg-[#222] px-6 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-black/25 sm:w-auto">
      {children}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-black/15 bg-black/[0.02] p-4 sm:p-5">
      <h4 className="text-lg font-semibold">{title}</h4>
      <div className="mt-4 grid gap-4">{children}</div>
    </div>
  );
}

function SavedMethod({ method, onEdit, onRemove }: { method: PayoutMethod; onEdit: () => void; onRemove: () => void }) {
  const Icon = method.type === "Bank account" ? Landmark : method.type === "PayPal" || method.type === "Digital wallet" ? WalletCards : Banknote;
  const provider = method.bankName || method.type;
  const accountNumber = method.accountNumber || method.accountLast4 || "Account number saved";

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-black/15 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef8f4] text-[#083f35]">
          <Icon size={21} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{provider}</p>
          <p className="mt-1 break-words text-sm text-black/60 sm:truncate">{method.accountName} - {accountNumber} - {method.currency}</p>
        </div>
      </div>
      <div className="grid w-full grid-cols-[1fr_auto] gap-2 sm:w-auto">
        <button type="button" onClick={onEdit} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:border-black">
          Edit
        </button>
        <button type="button" onClick={onRemove} className="grid size-10 place-items-center rounded-full transition hover:bg-black/[0.06]" aria-label={`Remove ${provider}`}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

function HelpRow({ title, open, onClick, children }: { title: string; open: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="border-t border-black/10 first:mt-4">
      <button type="button" aria-expanded={open} onClick={onClick} className="flex min-h-14 w-full items-center justify-between gap-3 py-4 text-left font-semibold underline">
        <span className="min-w-0 break-words">{title}</span>
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2 font-semibold">
      <span>{label}</span>
      <input
        value={value}
        readOnly
        className="min-h-12 rounded-xl border border-black/15 bg-black/[0.03] px-4 font-normal text-black/70 outline-none"
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
