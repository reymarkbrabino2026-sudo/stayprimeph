"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { assertValidCsrfForm } from "@/lib/csrf";
import { appendHostExpenses, readHostExpenses, removeHostExpense, replaceHostExpense } from "@/lib/host-expense-store";
import { readHostMonthlyReports, removeHostMonthlyReport, saveHostMonthlyReport as saveHostMonthlyReportEntry } from "@/lib/host-report-store";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import type { HostExpense, HostMonthlyReport } from "@/lib/types";
import { getUsers } from "@/lib/users";

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

function formValueAt(values: FormDataEntryValue[], index: number) {
  return values[index] ?? null;
}

function reportsPath(month: string, params: Record<string, string | number>) {
  const search = new URLSearchParams({ month });
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  return `/host/reports?${search.toString()}`;
}

async function requireHostReportUser(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const user = await requireRole("host", { forbiddenMessage: "Only hosts can save sales entries." });
  requireVerifiedEmail(user);
  return user;
}

async function requireHostOrAdminReportUser(formData: FormData, message: string) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const user = await requireRole(["host", "admin"], { forbiddenMessage: message });
  requireVerifiedEmail(user);
  return user;
}

export async function saveHostMonthlyReport(formData: FormData) {
  const user = await requireHostReportUser(formData);

  const reportDate = cleanRequiredText(formData.get("reportDate"), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
    redirect(reportsPath(new Date().toISOString().slice(0, 7), { reportError: "Choose a valid sales date." }));
  }
  const month = monthFromDate(reportDate);

  const reportIntent = String(formData.get("reportIntent") ?? "") === "addSales" ? "addSales" : "saveReport";
  const submittedSales = cleanAmount(formData.get("salesAmount"));
  if (reportIntent === "addSales" && submittedSales <= 0) {
    redirect(reportsPath(month, { reportError: "Enter a sales amount greater than zero." }));
  }

  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);
  const reports = await readHostMonthlyReports();
  const now = new Date().toISOString();
  const reportId = cleanRequiredText(formData.get("reportId"), 100);
  const existing = reportId ? reports.find((report) => report.id === reportId) : undefined;
  if (reportId && (!existing || existing.hostId !== user.id)) {
    redirect(reportsPath(month, { reportError: "We could not find that sale." }));
  }
  const nextReport: HostMonthlyReport = {
    id: existing?.id ?? randomUUID(),
    hostId: user.id,
    month,
    reportDate,
    salesAmount: submittedSales,
    expensesAmount: cleanAmount(formData.get("expensesAmount")),
    notes: notes || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  try {
    await saveHostMonthlyReportEntry(nextReport);
  } catch (error) {
    console.error("Failed to save host sales", error);
    redirect(reportsPath(month, { reportError: "We could not save the sales entry. Please try again." }));
  }

  revalidatePath("/host/reports");
  redirect(reportsPath(month, reportIntent === "addSales" ? { salesAdded: "1" } : { reportSaved: "1" }));
}

export async function deleteHostMonthlyReport(formData: FormData) {
  const user = await requireHostOrAdminReportUser(formData, "Only hosts and admins can delete sales entries.");

  const reportId = cleanRequiredText(formData.get("reportId"), 100);
  const fallbackMonth = cleanRequiredText(formData.get("month"), 7);
  const reports = await readHostMonthlyReports();
  const existing = reports.find((report) => report.id === reportId);
  const redirectMonth = existing?.month ?? (fallbackMonth.match(/^\d{4}-\d{2}$/) ? fallbackMonth : new Date().toISOString().slice(0, 7));
  if (!existing) redirect(reportsPath(redirectMonth, { reportError: "We could not find that report." }));
  if (user.role !== "admin" && existing.hostId !== user.id) throw new Error("You can only delete your own sales entries.");

  try {
    await removeHostMonthlyReport(reportId);
  } catch (error) {
    console.error("Failed to delete host sales", error);
    redirect(reportsPath(redirectMonth, { reportError: "We could not delete the sales entry. Please try again." }));
  }

  revalidatePath("/host/reports");
  redirect(reportsPath(redirectMonth, { reportDeleted: "1" }));
}

export async function saveHostExpense(formData: FormData) {
  const user = await requireHostOrAdminReportUser(formData, "Only hosts and admins can add expenses.");

  let hostId = user.id;
  if (user.role === "admin") {
    const selectedHostId = cleanRequiredText(formData.get("hostId"), 100);
    const hostUsers = (await getUsers()).filter((item) => item.role === "host");
    if (!hostUsers.some((host) => host.id === selectedHostId)) {
      redirect(reportsPath(new Date().toISOString().slice(0, 7), { expenseError: "Choose a host before saving expenses." }));
    }
    hostId = selectedHostId;
  }

  const expenseDates = formData.getAll("expenseDate");
  const categories = formData.getAll("category");
  const amounts = formData.getAll("amount");
  const vendors = formData.getAll("vendor");
  const descriptions = formData.getAll("description");
  const receiptReferences = formData.getAll("receiptReference");
  if (expenseDates.length === 0) redirect(reportsPath(new Date().toISOString().slice(0, 7), { expenseError: "Add at least one expense." }));

  const now = new Date().toISOString();
  let firstMonth = new Date().toISOString().slice(0, 7);
  const nextExpenses: HostExpense[] = expenseDates.map((dateValue, index) => {
    const expenseDate = cleanRequiredText(dateValue, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) redirect(reportsPath(firstMonth, { expenseError: "Choose a valid expense date." }));

    const category = cleanRequiredText(formValueAt(categories, index), 40);
    if (!expenseCategories.has(category)) redirect(reportsPath(monthFromDate(expenseDate), { expenseError: "Choose a valid expense category." }));

    const amount = cleanAmount(formValueAt(amounts, index));
    if (amount <= 0) redirect(reportsPath(monthFromDate(expenseDate), { expenseError: "Enter an expense amount greater than zero." }));

    const vendor = cleanRequiredText(formValueAt(vendors, index), 120);
    if (!vendor) redirect(reportsPath(monthFromDate(expenseDate), { expenseError: "Enter a vendor or payee." }));

    if (index === 0) firstMonth = monthFromDate(expenseDate);

    return {
      id: randomUUID(),
      hostId,
      expenseDate,
      month: monthFromDate(expenseDate),
      category,
      amount,
      vendor,
      description: cleanRequiredText(formValueAt(descriptions, index), 500) || undefined,
      receiptReference: cleanRequiredText(formValueAt(receiptReferences, index), 180) || undefined,
      createdAt: now,
      updatedAt: now,
    };
  });

  try {
    await appendHostExpenses(nextExpenses);
  } catch (error) {
    console.error("Failed to save host expenses", error);
    redirect(reportsPath(nextExpenses[0].month, { expenseError: "We could not save the expense. Please try again." }));
  }

  revalidatePath("/host/reports");
  redirect(reportsPath(nextExpenses[0].month, { expenseSaved: nextExpenses.length }));
}

export async function updateHostExpense(formData: FormData) {
  const user = await requireHostOrAdminReportUser(formData, "Only hosts and admins can edit expenses.");

  const expenseId = cleanRequiredText(formData.get("expenseId"), 100);
  const expenseDate = cleanRequiredText(formData.get("expenseDate"), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) redirect(reportsPath(new Date().toISOString().slice(0, 7), { expenseError: "Choose a valid expense date." }));

  const category = cleanRequiredText(formData.get("category"), 40);
  if (!expenseCategories.has(category)) redirect(reportsPath(monthFromDate(expenseDate), { expenseError: "Choose a valid expense category." }));

  const amount = cleanAmount(formData.get("amount"));
  if (amount <= 0) redirect(reportsPath(monthFromDate(expenseDate), { expenseError: "Enter an expense amount greater than zero." }));

  const vendor = cleanRequiredText(formData.get("vendor"), 120);
  if (!vendor) redirect(reportsPath(monthFromDate(expenseDate), { expenseError: "Enter a vendor or payee." }));

  const expenses = await readHostExpenses();
  const existing = expenses.find((expense) => expense.id === expenseId);
  if (!existing) redirect(reportsPath(monthFromDate(expenseDate), { expenseError: "We could not find that expense." }));
  if (user.role !== "admin" && existing.hostId !== user.id) throw new Error("You can only edit your own expenses.");

  const updatedExpense: HostExpense = {
    ...existing,
    expenseDate,
    month: monthFromDate(expenseDate),
    category,
    amount,
    vendor,
    description: cleanRequiredText(formData.get("description"), 500) || undefined,
    receiptReference: cleanRequiredText(formData.get("receiptReference"), 180) || undefined,
    updatedAt: new Date().toISOString(),
  };

  try {
    await replaceHostExpense(updatedExpense);
  } catch (error) {
    console.error("Failed to update host expense", error);
    redirect(reportsPath(updatedExpense.month, { expenseError: "We could not update the expense. Please try again." }));
  }

  revalidatePath("/host/reports");
  redirect(reportsPath(updatedExpense.month, { expenseUpdated: "1" }));
}

export async function deleteHostExpense(formData: FormData) {
  const user = await requireHostOrAdminReportUser(formData, "Only hosts and admins can delete expenses.");

  const expenseId = cleanRequiredText(formData.get("expenseId"), 100);
  const fallbackMonth = cleanRequiredText(formData.get("month"), 7);
  const expenses = await readHostExpenses();
  const existing = expenses.find((expense) => expense.id === expenseId);
  const redirectMonth = existing?.month ?? (fallbackMonth.match(/^\d{4}-\d{2}$/) ? fallbackMonth : new Date().toISOString().slice(0, 7));
  if (!existing) redirect(reportsPath(redirectMonth, { expenseError: "We could not find that expense." }));
  if (user.role !== "admin" && existing.hostId !== user.id) throw new Error("You can only delete your own expenses.");

  try {
    await removeHostExpense(expenseId);
  } catch (error) {
    console.error("Failed to delete host expense", error);
    redirect(reportsPath(redirectMonth, { expenseError: "We could not delete the expense. Please try again." }));
  }

  revalidatePath("/host/reports");
  redirect(reportsPath(redirectMonth, { expenseDeleted: "1" }));
}
