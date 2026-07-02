"use client";

import Link from "next/link";
import { AlertTriangle, Loader2, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { csrfFieldName } from "@/lib/csrf-fields";
import type { HostMonthlyReport } from "@/lib/types";

type HostMonthlyReportActionsProps = {
  csrfToken: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
  editHref: string;
  report: HostMonthlyReport & { hostName?: string };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function reportDateLabel(report: HostMonthlyReport) {
  return new Date(`${report.reportDate ?? `${report.month}-01`}T00:00:00Z`).toLocaleDateString();
}

export function HostMonthlyReportActions({ csrfToken, deleteAction, editHref, report }: HostMonthlyReportActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isDeleting) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDeleting(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isDeleting]);

  return (
    <div className="grid gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap sm:justify-end">
      <Link
        href={editHref}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 px-4 font-semibold text-black transition hover:border-black/25"
      >
        <Pencil className="size-4" aria-hidden="true" />
        Edit
      </Link>
      <button
        type="button"
        onClick={() => setIsDeleting(true)}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#d85d32]/25 px-4 font-semibold text-[#9b3b1d] transition hover:bg-[#fff3ed]"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Delete
      </button>

      {isDeleting ? (
        <DeleteReportDialog
          action={deleteAction}
          csrfToken={csrfToken}
          onClose={() => setIsDeleting(false)}
          report={report}
        />
      ) : null}
    </div>
  );
}

function DeleteReportDialog({
  action,
  csrfToken,
  onClose,
  report,
}: {
  action: (formData: FormData) => void | Promise<void>;
  csrfToken: string;
  onClose: () => void;
  report: HostMonthlyReport & { hostName?: string };
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        role="dialog"
        aria-labelledby="delete-report-title"
        className="w-full max-w-md overflow-hidden rounded-[1.5rem] bg-white shadow-2xl shadow-black/25"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4 border-b border-black/10 bg-[#fff8f3] p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ffe1d3] text-[#a9441f]">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9b3b1d]/70">Confirm delete</p>
            <h2 id="delete-report-title" className="mt-1 text-xl font-bold text-black">Delete this sale?</h2>
            <p className="mt-2 text-sm leading-6 text-black/60">
              This removes the saved sales entry for {reportDateLabel(report)}.
            </p>
          </div>
        </div>

        <form action={action} className="grid gap-4 p-5">
          <input type="hidden" name={csrfFieldName} value={csrfToken} />
          <input type="hidden" name="reportId" value={report.id} />
          <input type="hidden" name="month" value={report.month} />
          <div className="rounded-2xl border border-black/10 bg-[#fbfaf8] p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-black">{report.hostName ?? "Sales"}</span>
              <span className="font-bold text-black">{reportDateLabel(report)}</span>
            </div>
            <div className="mt-3 grid gap-3 text-black/60 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/35">Sales amount</p>
                <p className="mt-1 font-semibold text-black">{formatCurrency(report.salesAmount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/35">Note</p>
                <p className="mt-1 font-semibold text-black">{report.notes ?? "None"}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-5 font-semibold text-black/65 transition hover:border-black/25 hover:text-black"
            >
              Cancel
            </button>
            <DeleteSubmitButton />
          </div>
        </form>
      </section>
    </div>
  );
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9b3b1d] px-5 font-semibold text-white transition hover:bg-[#7e2f16] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
      {pending ? "Deleting..." : "Delete sale"}
    </button>
  );
}
