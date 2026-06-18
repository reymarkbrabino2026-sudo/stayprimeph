"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveFinancialSettingsAction } from "@/app/account-settings/actions";
import { StepUpPasswordField } from "@/components/account/step-up-password-field";
import type { FinancialSettingsState, TaxpayerInfo, VatInfo } from "@/lib/account-settings-types";

const emptyTaxpayer: TaxpayerInfo = {
  legalName: "",
  country: "Philippines",
  taxId: "",
  address: "",
};

const emptyVat: VatInfo = {
  businessName: "",
  country: "Philippines",
  vatId: "",
};

export function TaxpayerSettings({ initialFinancial, requiresStepUp = false }: { initialFinancial: FinancialSettingsState; requiresStepUp?: boolean }) {
  const [financial, setFinancial] = useState(initialFinancial);
  const [taxpayerDraft, setTaxpayerDraft] = useState(emptyTaxpayer);
  const [vatDraft, setVatDraft] = useState(emptyVat);
  const [editing, setEditing] = useState<"taxpayer" | "vat" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const taxpayer = financial.taxpayer;
  const vat = financial.vat;

  function saveFinancial(next: FinancialSettingsState, onSaved: () => void) {
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
      onSaved();
    });
  }

  function saveTaxpayer() {
    const next: TaxpayerInfo = {
      ...taxpayerDraft,
      legalName: taxpayerDraft.legalName.trim(),
      taxId: taxpayerDraft.taxId.trim(),
      address: taxpayerDraft.address.trim(),
      country: taxpayerDraft.country.trim() || "Philippines",
    };
    saveFinancial({ ...financial, taxpayer: next }, () => setEditing(null));
  }

  function saveVat() {
    const next: VatInfo = {
      ...vatDraft,
      businessName: vatDraft.businessName.trim(),
      country: vatDraft.country.trim() || "Philippines",
      vatId: vatDraft.vatId.trim(),
    };
    saveFinancial({ ...financial, vat: next }, () => setEditing(null));
  }

  function openTaxpayerForm() {
    setTaxpayerDraft(taxpayer ?? emptyTaxpayer);
    setEditing("taxpayer");
  }

  function openVatForm() {
    setVatDraft(vat ?? { ...emptyVat, businessName: taxpayer?.legalName ?? "" });
    setEditing("vat");
  }

  return (
    <>
      <section className="mt-12">
        {message ? <p className="mb-4 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
        <h3 className="text-2xl font-semibold">Taxpayer information</h3>
        <p className="mt-2">
          Tax info is required for most countries/regions.{" "}
          <Link href="/support" className="font-semibold underline">
            Learn more
          </Link>
        </p>
        <div className="mt-5 max-w-md">
          <StepUpPasswordField required={requiresStepUp} value={currentPassword} onChange={setCurrentPassword} />
        </div>
        {taxpayer ? (
          <SavedCard title={taxpayer.legalName} lines={[taxpayer.country, taxpayer.taxId, taxpayer.address]} onEdit={openTaxpayerForm} />
        ) : (
          <PrimaryButton onClick={openTaxpayerForm}>Add tax info</PrimaryButton>
        )}
        {editing === "taxpayer" ? (
          <FormPanel title={taxpayer ? "Edit tax info" : "Add tax info"}>
            <TextField label="Legal name" value={taxpayerDraft.legalName} onChange={(value) => setTaxpayerDraft({ ...taxpayerDraft, legalName: value })} />
            <TextField label="Country/region" value={taxpayerDraft.country} onChange={(value) => setTaxpayerDraft({ ...taxpayerDraft, country: value })} />
            <TextField label="Tax ID number" value={taxpayerDraft.taxId} onChange={(value) => setTaxpayerDraft({ ...taxpayerDraft, taxId: value })} />
            <TextField label="Registered address" value={taxpayerDraft.address} onChange={(value) => setTaxpayerDraft({ ...taxpayerDraft, address: value })} />
            <FormActions onCancel={() => setEditing(null)} onSave={saveTaxpayer} disabled={isPending || !taxpayerDraft.legalName.trim() || !taxpayerDraft.taxId.trim()} />
          </FormPanel>
        ) : null}
      </section>

      <section className="mt-16">
        <h3 className="text-2xl font-semibold">Value Added Tax (VAT)</h3>
        <p className="mt-2">
          If you are VAT-registered, please add your VAT ID.{" "}
          <Link href="/support" className="font-semibold underline">
            Learn more
          </Link>
        </p>
        {vat ? (
          <SavedCard title={vat.vatId} lines={[vat.businessName, vat.country]} onEdit={openVatForm} />
        ) : (
          <PrimaryButton onClick={openVatForm}>Add VAT ID number</PrimaryButton>
        )}
        {editing === "vat" ? (
          <FormPanel title={vat ? "Edit VAT ID number" : "Add VAT ID number"}>
            <TextField label="Business name" value={vatDraft.businessName} onChange={(value) => setVatDraft({ ...vatDraft, businessName: value })} />
            <TextField label="Country/region" value={vatDraft.country} onChange={(value) => setVatDraft({ ...vatDraft, country: value })} />
            <TextField label="VAT ID number" value={vatDraft.vatId} onChange={(value) => setVatDraft({ ...vatDraft, vatId: value })} />
            <FormActions onCancel={() => setEditing(null)} onSave={saveVat} disabled={isPending || !vatDraft.businessName.trim() || !vatDraft.vatId.trim()} />
          </FormPanel>
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

function SavedCard({ title, lines, onEdit }: { title: string; lines: string[]; onEdit: () => void }) {
  return (
    <div className="mt-7 rounded-2xl border border-black/15 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold">{title}</h4>
          <div className="mt-2 space-y-1 text-sm text-black/65">
            {lines.filter(Boolean).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
        <button type="button" onClick={onEdit} className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:border-black">
          Edit
        </button>
      </div>
    </div>
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
