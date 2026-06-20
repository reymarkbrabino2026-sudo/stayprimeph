"use client";

import { Download } from "lucide-react";
import Link from "next/link";

import { formatCurrency, formatDate } from "@/lib/utils";

export type TaxDocumentRecord = {
  id: string;
  year: number;
  month: string;
  issuedAt: string;
  description: string;
  amount: number;
  status: string;
};

export function TaxDocumentSettings({ records, years }: { records: TaxDocumentRecord[]; years: number[] }) {
  const recordsByYear = new Map<number, TaxDocumentRecord[]>();
  for (const record of records) {
    recordsByYear.set(record.year, [...(recordsByYear.get(record.year) ?? []), record]);
  }

  return (
    <>
      <section className="mt-12 rounded-2xl border border-black/15 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold">Invoices</h3>
            <p className="mt-2 text-black/65">Download tax invoices generated from your StayPrimePH booking payments and host payouts.</p>
          </div>
          <button
            type="button"
            onClick={() => downloadRecords(records, "stayprimeph-tax-invoices.csv")}
            disabled={records.length === 0}
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-black/15 px-5 font-semibold transition hover:border-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={18} />
            Download all
          </button>
        </div>
      </section>

      <section className="mt-12">
        <h3 className="text-2xl font-semibold">Documents</h3>
        <p className="mt-2 text-black/65">
          Review and download documents often required for tax filings. Detailed earnings information is available in your{" "}
          <Link href="/host/reports" className="font-semibold underline">
            host reports
          </Link>
          .
        </p>
      </section>

      <div className="mt-8">
        {years.map((year) => {
          const yearRecords = recordsByYear.get(year) ?? [];
          return (
            <section key={year} className="border-t border-black/10 py-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-semibold">{year}</h3>
                  <p className="mt-2 text-black/65">{yearRecords.length ? `${yearRecords.length} document${yearRecords.length === 1 ? "" : "s"} issued` : "No tax document issued"}</p>
                </div>
                {yearRecords.length ? (
                  <button
                    type="button"
                    onClick={() => downloadRecords(yearRecords, `stayprimeph-tax-documents-${year}.csv`)}
                    className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-black/15 px-4 text-sm font-semibold transition hover:border-black"
                  >
                    <Download size={16} />
                    Download {year}
                  </button>
                ) : null}
              </div>
              {yearRecords.length ? (
                <div className="mt-5 space-y-3">
                  {yearRecords.map((record) => (
                    <div key={record.id} className="grid gap-3 rounded-2xl border border-black/10 p-4 sm:grid-cols-[1fr_auto]">
                      <div>
                        <p className="font-semibold">{record.description}</p>
                        <p className="mt-1 text-sm text-black/60">
                          {record.id} - {formatDate(record.issuedAt)} - {record.status}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(record.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}

function downloadRecords(records: TaxDocumentRecord[], filename: string) {
  if (!records.length) return;

  const header = ["Document ID", "Year", "Month", "Issued At", "Description", "Amount PHP", "Status"];
  const rows = records.map((record) => [
    record.id,
    String(record.year),
    record.month,
    record.issuedAt,
    record.description,
    String(record.amount),
    record.status,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
