"use client";

import { ChevronDown, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  expandHash?: string;
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
  expandHash,
  intent = "saveReport",
  reportId,
}: HostMonthlyReportFormProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isAddingSales = intent === "addSales";
  const formId = "host-monthly-report-form-fields";

  useEffect(() => {
    if (!expandHash) return;

    const openFromHash = () => {
      if (window.location.hash === expandHash) setIsOpen(true);
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [expandHash]);

  if (!isOpen) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-controls={formId}
          aria-expanded="false"
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[1.25rem] border border-dashed border-black/15 bg-[#fbfaf8] px-4 text-left font-semibold text-black transition hover:border-[#21170f]/25 hover:bg-white"
        >
          <span className="inline-flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0b8d65] text-white">
              <Plus className="size-4" aria-hidden="true" />
            </span>
            <span className="truncate">{buttonLabel}</span>
          </span>
          <ChevronDown className="size-5 shrink-0 text-black/45" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form id={formId} action={action} className="mt-5 grid gap-4 md:grid-cols-2">
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
