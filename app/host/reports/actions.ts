"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { readHostMonthlyReports, writeHostMonthlyReports } from "@/lib/host-report-store";
import type { HostMonthlyReport } from "@/lib/types";

function cleanAmount(value: FormDataEntryValue | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
}

export async function saveHostMonthlyReport(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "host") throw new Error("Only hosts can save monthly reports.");

  const month = String(formData.get("month") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Choose a valid report month.");

  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);
  const reports = await readHostMonthlyReports();
  const now = new Date().toISOString();
  const existing = reports.find((report) => report.hostId === user.id && report.month === month);
  const nextReport: HostMonthlyReport = {
    id: existing?.id ?? randomUUID(),
    hostId: user.id,
    month,
    salesAmount: cleanAmount(formData.get("salesAmount")),
    expensesAmount: cleanAmount(formData.get("expensesAmount")),
    notes: notes || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await writeHostMonthlyReports(existing
    ? reports.map((report) => report.id === existing.id ? nextReport : report)
    : [nextReport, ...reports]);

  revalidatePath("/host/reports");
  revalidatePath("/host/erp");
  redirect(`/host/reports?month=${month}`);
}
