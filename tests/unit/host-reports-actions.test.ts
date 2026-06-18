import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({ id: "host-1", role: "host", emailVerifiedAt: "2026-06-18T00:00:00.000Z" })),
  requireRole: vi.fn(async () => ({ id: "host-1", role: "host", emailVerifiedAt: "2026-06-18T00:00:00.000Z" })),
  requireVerifiedEmail: vi.fn((user: { emailVerifiedAt?: string }) => {
    if (!user.emailVerifiedAt) throw new Error("Verify your email address before using this feature.");
  }),
}));

vi.mock("@/lib/request-safety", () => ({
  assertTrustedRequestOrigin: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  assertValidCsrfForm: vi.fn(),
  assertValidCsrfToken: vi.fn(),
  csrfFieldName: "csrfToken",
  getCsrfToken: vi.fn(async () => "csrf-test-token"),
  invalidCsrfMessage: "Request token could not be verified.",
}));

vi.mock("@/lib/users", () => ({
  getUsers: vi.fn(async () => [
    { id: "host-1", name: "Host One", email: "host@example.com", role: "host", avatar: "", phone: "", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "admin-1", name: "Admin One", email: "admin@example.com", role: "admin", avatar: "", phone: "", createdAt: "2026-01-01T00:00:00.000Z" },
  ]),
}));

vi.mock("@/lib/host-expense-store", () => ({
  appendHostExpenses: vi.fn(),
  readHostExpenses: vi.fn(async () => []),
  removeHostExpense: vi.fn(),
  replaceHostExpense: vi.fn(),
  writeHostExpenses: vi.fn(),
}));

vi.mock("@/lib/host-report-store", () => ({
  readHostMonthlyReports: vi.fn(async () => []),
  removeHostMonthlyReport: vi.fn(),
  saveHostMonthlyReport: vi.fn(),
  writeHostMonthlyReports: vi.fn(),
}));

import { appendHostExpenses, readHostExpenses, removeHostExpense, replaceHostExpense } from "@/lib/host-expense-store";
import { readHostMonthlyReports, removeHostMonthlyReport, saveHostMonthlyReport as saveHostMonthlyReportEntry } from "@/lib/host-report-store";
import { deleteHostExpense, deleteHostMonthlyReport, saveHostExpense, saveHostMonthlyReport, updateHostExpense } from "@/app/host/reports/actions";
import { requireRole } from "@/lib/auth";

describe("saveHostExpense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves every submitted expense row", async () => {
    const formData = new FormData();
    formData.append("expenseDate", "2026-06-10");
    formData.append("category", "Cleaning");
    formData.append("amount", "120.50");
    formData.append("vendor", "Cleaner A");
    formData.append("receiptReference", "OR-1");
    formData.append("description", "Turnover clean");
    formData.append("expenseDate", "2026-06-11");
    formData.append("category", "Utilities");
    formData.append("amount", "80");
    formData.append("vendor", "Power Co");
    formData.append("receiptReference", "BILL-2");
    formData.append("description", "Electric bill");

    await expect(saveHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(readHostExpenses).not.toHaveBeenCalled();
    expect(appendHostExpenses).toHaveBeenCalledWith([
      expect.objectContaining({
        hostId: "host-1",
        expenseDate: "2026-06-10",
        month: "2026-06",
        category: "Cleaning",
        amount: 120.5,
        vendor: "Cleaner A",
        receiptReference: "OR-1",
        description: "Turnover clean",
      }),
      expect.objectContaining({
        hostId: "host-1",
        expenseDate: "2026-06-11",
        month: "2026-06",
        category: "Utilities",
        amount: 80,
        vendor: "Power Co",
        receiptReference: "BILL-2",
        description: "Electric bill",
      }),
    ]);
  });

  it("lets admins add expenses for a selected host", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ id: "admin-1", role: "admin", emailVerifiedAt: "2026-06-18T00:00:00.000Z" } as Awaited<ReturnType<typeof requireRole>>);

    const formData = new FormData();
    formData.append("hostId", "host-1");
    formData.append("expenseDate", "2026-06-12");
    formData.append("category", "Repairs");
    formData.append("amount", "450");
    formData.append("vendor", "Repair team");

    await expect(saveHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(appendHostExpenses).toHaveBeenCalledWith([
      expect.objectContaining({
        hostId: "host-1",
        expenseDate: "2026-06-12",
        category: "Repairs",
        amount: 450,
        vendor: "Repair team",
      }),
    ]);
  });

  it("updates an existing host expense", async () => {
    vi.mocked(readHostExpenses).mockResolvedValueOnce([
      {
        id: "expense-1",
        hostId: "host-1",
        expenseDate: "2026-06-01",
        month: "2026-06",
        category: "Cleaning",
        amount: 100,
        vendor: "Old vendor",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ]);

    const formData = new FormData();
    formData.append("expenseId", "expense-1");
    formData.append("expenseDate", "2026-06-15");
    formData.append("category", "Utilities");
    formData.append("amount", "250");
    formData.append("vendor", "Power Co");
    formData.append("receiptReference", "BILL-9");
    formData.append("description", "Updated bill");

    await expect(updateHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(replaceHostExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "expense-1",
        hostId: "host-1",
        expenseDate: "2026-06-15",
        month: "2026-06",
        category: "Utilities",
        amount: 250,
        vendor: "Power Co",
        receiptReference: "BILL-9",
        description: "Updated bill",
      }),
    );
  });

  it("deletes an existing host expense", async () => {
    vi.mocked(readHostExpenses).mockResolvedValueOnce([
      {
        id: "expense-1",
        hostId: "host-1",
        expenseDate: "2026-06-01",
        month: "2026-06",
        category: "Cleaning",
        amount: 100,
        vendor: "Cleaner",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "expense-2",
        hostId: "host-1",
        expenseDate: "2026-06-02",
        month: "2026-06",
        category: "Repairs",
        amount: 200,
        vendor: "Repair team",
        createdAt: "2026-06-02T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
      },
    ]);

    const formData = new FormData();
    formData.append("expenseId", "expense-1");
    formData.append("month", "2026-06");

    await expect(deleteHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(removeHostExpense).toHaveBeenCalledWith("expense-1");
  });

  it("deletes an existing sales entry", async () => {
    vi.mocked(readHostMonthlyReports).mockResolvedValueOnce([
      {
        id: "report-1",
        hostId: "host-1",
        month: "2026-06",
        reportDate: "2026-06-17",
        salesAmount: 60000,
        expensesAmount: 15350,
        createdAt: "2026-06-17T00:00:00.000Z",
        updatedAt: "2026-06-17T00:00:00.000Z",
      },
    ]);

    const formData = new FormData();
    formData.append("reportId", "report-1");
    formData.append("month", "2026-06");

    await expect(deleteHostMonthlyReport(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(removeHostMonthlyReport).toHaveBeenCalledWith("report-1");
  });

  it("adds a new sales entry for the selected month", async () => {
    vi.mocked(readHostMonthlyReports).mockResolvedValueOnce([
      {
        id: "report-1",
        hostId: "host-1",
        month: "2026-06",
        reportDate: "2026-06-17",
        salesAmount: 60000,
        expensesAmount: 15350,
        notes: "Existing note",
        createdAt: "2026-06-17T00:00:00.000Z",
        updatedAt: "2026-06-17T00:00:00.000Z",
      },
    ]);

    const formData = new FormData();
    formData.append("reportIntent", "addSales");
    formData.append("reportDate", "2026-06-18");
    formData.append("salesAmount", "5000");
    formData.append("expensesAmount", "0");
    formData.append("notes", "New event sale");

    await expect(saveHostMonthlyReport(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06&salesAdded=1");

    expect(saveHostMonthlyReportEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: "host-1",
        month: "2026-06",
        reportDate: "2026-06-18",
        salesAmount: 5000,
        expensesAmount: 0,
        notes: "New event sale",
      }),
    );
  });

  it("edits the selected sales entry by id", async () => {
    vi.mocked(readHostMonthlyReports).mockResolvedValueOnce([
      {
        id: "report-1",
        hostId: "host-1",
        month: "2026-06",
        reportDate: "2026-06-17",
        salesAmount: 60000,
        expensesAmount: 0,
        notes: "Original sale",
        createdAt: "2026-06-17T00:00:00.000Z",
        updatedAt: "2026-06-17T00:00:00.000Z",
      },
      {
        id: "report-2",
        hostId: "host-1",
        month: "2026-07",
        reportDate: "2026-07-01",
        salesAmount: 10000,
        expensesAmount: 0,
        notes: "July sale",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    const formData = new FormData();
    formData.append("reportId", "report-1");
    formData.append("reportIntent", "saveReport");
    formData.append("reportDate", "2026-06-20");
    formData.append("salesAmount", "75000");
    formData.append("expensesAmount", "0");
    formData.append("notes", "Updated sale");

    await expect(saveHostMonthlyReport(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06&reportSaved=1");

    expect(saveHostMonthlyReportEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "report-1",
        hostId: "host-1",
        month: "2026-06",
        reportDate: "2026-06-20",
        salesAmount: 75000,
        expensesAmount: 0,
        notes: "Updated sale",
        createdAt: "2026-06-17T00:00:00.000Z",
      }),
    );
  });
});
