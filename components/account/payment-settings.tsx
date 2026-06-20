"use client";

import { CreditCard, Download, Gift, Tag, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveFinancialSettingsAction } from "@/app/account-settings/actions";
import { StepUpPasswordField } from "@/components/account/step-up-password-field";
import type { Coupon, FinancialSettingsState, GiftCredit, SavedPaymentMethod } from "@/lib/account-settings-types";
import { formatCurrency, formatDate } from "@/lib/utils";

export type PaymentHistoryRecord = {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: string;
};

const emptyMethod: Omit<SavedPaymentMethod, "id"> = {
  cardholder: "",
  brand: "Visa",
  last4: "",
  expiry: "",
  billingZip: "",
};

export function PaymentSettings({
  initialFinancial,
  paymentHistory,
  requiresStepUp = false,
}: {
  initialFinancial: FinancialSettingsState;
  paymentHistory: PaymentHistoryRecord[];
  requiresStepUp?: boolean;
}) {
  const [openPanel, setOpenPanel] = useState<"payments" | "method" | "gift" | "coupon" | null>(null);
  const [financial, setFinancial] = useState(initialFinancial);
  const [methodDraft, setMethodDraft] = useState(emptyMethod);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [giftCode, setGiftCode] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const methods = financial.paymentMethods;
  const giftCredits = financial.giftCredits;
  const coupons = financial.coupons;

  const paymentTotals = useMemo(() => {
    const paid = paymentHistory.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.amount, 0);
    const refunded = paymentHistory.filter((item) => item.status === "Refunded").reduce((sum, item) => sum + item.amount, 0);
    return { paid, refunded };
  }, [paymentHistory]);

  function saveFinancial(next: FinancialSettingsState, onSaved?: () => void) {
    const previous = financial;
    setFinancial(next);
    setMessage("");
    startTransition(async () => {
      const result = await saveFinancialSettingsAction(next, currentPassword);
      if (requiresStepUp) setCurrentPassword("");
      if (!result.ok) {
        setFinancial(previous);
        setMessage(result.error);
        return;
      }
      setFinancial(result.data);
      setMessage("Saved.");
      onSaved?.();
    });
  }

  function saveGiftCredits(next: GiftCredit[]) {
    saveFinancial({ ...financial, giftCredits: next });
  }

  function saveCoupons(next: Coupon[]) {
    saveFinancial({ ...financial, coupons: next });
  }

  function saveMethods(next: SavedPaymentMethod[]) {
    saveFinancial({ ...financial, paymentMethods: next });
  }

  function openMethodForm(method?: SavedPaymentMethod) {
    setMethodDraft(method ? { cardholder: method.cardholder, brand: method.brand, last4: method.last4, expiry: method.expiry, billingZip: method.billingZip } : emptyMethod);
    setEditingMethodId(method?.id ?? null);
    setOpenPanel("method");
  }

  function saveMethod() {
    const nextMethod: SavedPaymentMethod = {
      id: editingMethodId ?? crypto.randomUUID(),
      cardholder: methodDraft.cardholder.trim(),
      brand: methodDraft.brand.trim() || "Card",
      last4: methodDraft.last4.replace(/\D/g, "").slice(-4),
      expiry: methodDraft.expiry.trim(),
      billingZip: methodDraft.billingZip.trim(),
    };
    const next = editingMethodId ? methods.map((method) => (method.id === editingMethodId ? nextMethod : method)) : [...methods, nextMethod];
    saveFinancial({ ...financial, paymentMethods: next }, () => {
      setMethodDraft(emptyMethod);
      setEditingMethodId(null);
      setOpenPanel(null);
    });
  }

  function addGiftCredit() {
    const code = giftCode.trim().toUpperCase();
    if (!code) return;
    const amount = code.startsWith("STAYPRIMEPH") ? 50 : 25;
    saveGiftCredits([...giftCredits.filter((credit) => credit.code !== code), { code, amount }]);
    setGiftCode("");
    setOpenPanel(null);
  }

  function addCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    saveCoupons([...coupons.filter((coupon) => coupon.code !== code), { code, discount: code.includes("20") ? "20% off" : "10% off" }]);
    setCouponCode("");
    setOpenPanel(null);
  }

  function exportPayments() {
    const blob = new Blob([JSON.stringify(paymentHistory, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stayprimeph-payments.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="mt-9">
        {message ? <p className="mb-4 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
        <h3 className="text-2xl font-semibold">Your payments</h3>
        <p className="mt-2">Keep track of all your payments and refunds.</p>
        <div className="mt-5 max-w-md">
          <StepUpPasswordField required={requiresStepUp} value={currentPassword} onChange={setCurrentPassword} />
        </div>
        <PrimaryButton onClick={() => setOpenPanel((current) => (current === "payments" ? null : "payments"))}>Manage payments</PrimaryButton>
        {openPanel === "payments" ? (
          <Panel>
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryTile label="Paid" value={formatCurrency(paymentTotals.paid)} />
              <SummaryTile label="Refunded" value={formatCurrency(paymentTotals.refunded)} />
            </div>
            {paymentHistory.length > 0 ? (
              <div className="mt-4 space-y-3">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="grid gap-2 rounded-xl bg-white p-4 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-semibold">{payment.description}</p>
                      <p className="mt-1 text-sm text-black/60">
                        {payment.id} - {formatDate(payment.date)} - {payment.status}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-white p-4">
                <p className="font-semibold">No payment history yet</p>
                <p className="mt-1 text-sm text-black/60">Completed payments and refunds will appear here once you book a stay.</p>
              </div>
            )}
            <button type="button" onClick={exportPayments} disabled={paymentHistory.length === 0} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/15 px-5 font-semibold transition hover:border-black disabled:cursor-not-allowed disabled:opacity-50">
              <Download size={18} />
              Download history
            </button>
          </Panel>
        ) : null}
      </section>

      <section className="mt-20 border-b border-black/10 pb-8">
        <h3 className="text-2xl font-semibold">Payment methods</h3>
        <p className="mt-2 text-black/65">Add a payment method using our secure payment system, then start planning your next trip.</p>
        {methods.length > 0 ? (
          <div className="mt-7 space-y-3">
            {methods.map((method) => (
              <SavedRow
                key={method.id}
                icon={<CreditCard size={21} />}
                title={`${method.brand} ending in ${method.last4}`}
                detail={`${method.cardholder} - Expires ${method.expiry}`}
                onEdit={() => openMethodForm(method)}
                onRemove={() => saveMethods(methods.filter((item) => item.id !== method.id))}
              />
            ))}
          </div>
        ) : null}
        <PrimaryButton onClick={() => openMethodForm()}>{methods.length > 0 ? "Add another payment method" : "Add payment method"}</PrimaryButton>
        {openPanel === "method" ? (
          <Panel title={editingMethodId ? "Edit payment method" : "Add payment method"}>
            <TextField label="Cardholder name" value={methodDraft.cardholder} onChange={(value) => setMethodDraft({ ...methodDraft, cardholder: value })} />
            <TextField label="Card brand" value={methodDraft.brand} onChange={(value) => setMethodDraft({ ...methodDraft, brand: value })} />
            <TextField label="Last 4 digits" value={methodDraft.last4} onChange={(value) => setMethodDraft({ ...methodDraft, last4: value.replace(/\D/g, "").slice(0, 4) })} />
            <TextField label="Expiration date" placeholder="MM/YY" value={methodDraft.expiry} onChange={(value) => setMethodDraft({ ...methodDraft, expiry: value })} />
            <TextField label="Billing ZIP/postal code" value={methodDraft.billingZip} onChange={(value) => setMethodDraft({ ...methodDraft, billingZip: value })} />
            <FormActions onCancel={() => setOpenPanel(null)} onSave={saveMethod} disabled={isPending || !methodDraft.cardholder.trim() || methodDraft.last4.replace(/\D/g, "").length !== 4 || !methodDraft.expiry.trim()} />
          </Panel>
        ) : null}
      </section>

      <section className="mt-12">
        <h3 className="text-2xl font-semibold">StayPrimePH gift credit</h3>
        {giftCredits.length > 0 ? <CreditList icon={<Gift size={20} />} items={giftCredits.map((credit) => ({ title: credit.code, detail: `${formatCurrency(credit.amount)} credit` }))} /> : null}
        <PrimaryButton onClick={() => setOpenPanel((current) => (current === "gift" ? null : "gift"))}>Add gift card</PrimaryButton>
        {openPanel === "gift" ? (
          <Panel title="Add gift card">
            <TextField label="Gift card code" value={giftCode} onChange={setGiftCode} />
            <FormActions onCancel={() => setOpenPanel(null)} onSave={addGiftCredit} disabled={!giftCode.trim()} />
          </Panel>
        ) : null}
      </section>

      <section className="mt-16 border-b border-black/10 pb-7">
        <h3 className="text-2xl font-semibold">Coupons</h3>
        <p className="mt-7 flex justify-between">
          Your coupons <span>{coupons.length}</span>
        </p>
        {coupons.length > 0 ? <CreditList icon={<Tag size={20} />} items={coupons.map((coupon) => ({ title: coupon.code, detail: coupon.discount }))} /> : null}
        <PrimaryButton onClick={() => setOpenPanel((current) => (current === "coupon" ? null : "coupon"))}>Add coupon</PrimaryButton>
        {openPanel === "coupon" ? (
          <Panel title="Add coupon">
            <TextField label="Coupon code" value={couponCode} onChange={setCouponCode} />
            <FormActions onCancel={() => setOpenPanel(null)} onSave={addCoupon} disabled={!couponCode.trim()} />
          </Panel>
        ) : null}
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

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-black/15 bg-black/[0.02] p-5">
      {title ? <h4 className="mb-4 text-lg font-semibold">{title}</h4> : null}
      <div className="grid gap-4">{children}</div>
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

function SavedRow({
  icon,
  title,
  detail,
  onEdit,
  onRemove,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/15 p-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef8f4] text-[#083f35]">{icon}</span>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 truncate text-sm text-black/60">{detail}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:border-black">
          Edit
        </button>
        <button type="button" onClick={onRemove} className="grid size-10 place-items-center rounded-full transition hover:bg-black/[0.06]" aria-label={`Remove ${title}`}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

function CreditList({ icon, items }: { icon: React.ReactNode; items: Array<{ title: string; detail: string }> }) {
  return (
    <div className="mt-5 space-y-3">
      {items.map((item) => (
        <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-black/15 p-4">
          <span className="grid size-10 place-items-center rounded-xl bg-[#eef8f4] text-[#083f35]">{icon}</span>
          <span>
            <span className="block font-semibold">{item.title}</span>
            <span className="mt-1 block text-sm text-black/60">{item.detail}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 font-semibold">
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
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
