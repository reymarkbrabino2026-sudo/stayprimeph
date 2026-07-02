"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { csrfFieldName } from "@/lib/csrf-fields";

type HostMonthlyReportFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  buttonLabel: string;
  cancelHref?: string;
  csrfToken: string;
  defaultDate: string;
  defaultExpenses: number;
  defaultNotes?: string;
  defaultOpen?: boolean;
  defaultSales?: number;
  intent?: "addSales" | "saveReport";
  reportId?: string;
};

export function HostMonthlyReportForm({
  action,
  buttonLabel,
  cancelHref,
  csrfToken,
  defaultDate,
  defaultExpenses,
  defaultNotes,
  defaultOpen = false,
  defaultSales,
  intent = "saveReport",
  reportId,
}: HostMonthlyReportFormProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isAddingSales = intent === "addSales";

  if (!isOpen) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#21170f] px-5 font-semibold text-white transition hover:bg-[#21170f]/90"
        >
          <Plus className="size-4" aria-hidden="true" />
          {buttonLabel}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-5 grid gap-4 md:grid-cols-2">
      <input type="hidden" name={csrfFieldName} value={csrfToken} />
      {reportId ? <input type="hidden" name="reportId" value={reportId} /> : null}
      <input type="hidden" name="reportIntent" value={intent} />
      <input type="hidden" name="expensesAmount" value={defaultExpenses} />
      <label className="grid gap-2 text-sm font-semibold text-black/70">
        Date
        <input name="reportDate" type="date" defaultValue={defaultDate} className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-black/70">
        Sale amount
        <input name="salesAmount" type="number" min={isAddingSales ? "0.01" : "0"} step="0.01" defaultValue={defaultSales} className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-black/70 md:col-span-2">
        Note
        <textarea name="notes" defaultValue={defaultNotes} rows={4} className="rounded-2xl border px-4 py-3 font-normal text-black" placeholder="Customer, event, adjustment, or payment reference" />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row md:col-span-2">
        <button className="min-h-12 rounded-full bg-[#21170f] px-6 font-semibold text-white transition hover:bg-[#21170f]/90 md:w-fit">
          {isAddingSales ? "Add sale" : "Save sale"}
        </button>
        {cancelHref ? (
          <Link
            href={cancelHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-black/10 px-5 font-semibold text-black/65 transition hover:border-black/25 hover:text-black"
          >
            <X className="size-4" aria-hidden="true" />
            Cancel
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-black/10 px-5 font-semibold text-black/65 transition hover:border-black/25 hover:text-black"
          >
            <X className="size-4" aria-hidden="true" />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
