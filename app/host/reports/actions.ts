"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { readHostExpenses, writeHostExpenses } from "@/lib/host-expense-store";
import { readHostMonthlyReports, writeHostMonthlyReports } from "@/lib/host-report-store";
import type { HostExpense, HostMonthlyReport } from "@/lib/types";

const expenseCategories = new Set([
  "Cleaning",
  "Maintenance",
  "Utilities",
  "Supplies",
  "Repairs",
  "Marketing",
  "Service fees",
  "Other",
]);

function cleanAmount(value: FormDataEntryValue | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
}

function cleanRequiredText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function monthFromDate(value: string) {
  return value.slice(0, 7);
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

export async function saveHostExpense(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "host") throw new Error("Only hosts can add expenses.");

  const expenseDate = cleanRequiredText(formData.get("expenseDate"), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) throw new Error("Choose a valid expense date.");

  const category = cleanRequiredText(formData.get("category"), 40);
  if (!expenseCategories.has(category)) throw new Error("Choose a valid expense category.");

  const amount = cleanAmount(formData.get("amount"));
  if (amount <= 0) throw new Error("Enter an expense amount greater than zero.");

  const vendor = cleanRequiredText(formData.get("vendor"), 120);
  if (!vendor) throw new Error("Enter a vendor or payee.");

  const now = new Date().toISOString();
  const month = monthFromDate(expenseDate);
  const expense: HostExpense = {
    id: randomUUID(),
    hostId: user.id,
    expenseDate,
    month,
    category,
    amount,
    vendor,
    description: cleanRequiredText(formData.get("description"), 500) || undefined,
    receiptReference: cleanRequiredText(formData.get("receiptReference"), 180) || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const expenses = await readHostExpenses();
  await writeHostExpenses([expense, ...expenses]);

  revalidatePath("/host/reports");
  revalidatePath("/host/erp");
  redirect(`/host/reports?month=${month}`);
}
