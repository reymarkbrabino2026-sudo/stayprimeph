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
import { deleteHostExpense, deleteHostMonthlyReport, importHostExpensesFromCsv, saveHostExpense, saveHostMonthlyReport, updateHostExpense } from "@/app/host/reports/actions";
import { requireRole } from "@/lib/auth";

describe("saveHostExpense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves every submitted expense row", async () => {
    const formData = new FormData();
    formData.append("expenseDate", "2026-06-10");
    formData.append("category", "Office Supplies");
    formData.append("amount", "120.50");
    formData.append("quantity", "1");
    formData.append("unit", "pc");
    formData.append("vendor", "Trash can");
    formData.append("receiptReference", "OR-1");
    formData.append("description", "Office bin");
    formData.append("expenseDate", "2026-06-11");
    formData.append("category", "Electricity");
    formData.append("amount", "80");
    formData.append("quantity", "");
    formData.append("unit", "");
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
        category: "Office Supplies",
        amount: 120.5,
        quantity: 1,
        unit: "PC",
        vendor: "Trash can",
        receiptReference: "OR-1",
        description: "Office bin",
      }),
      expect.objectContaining({
        hostId: "host-1",
        expenseDate: "2026-06-11",
        month: "2026-06",
        category: "Electricity",
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
    formData.append("quantity", "2");
    formData.append("unit", "set");
    formData.append("vendor", "Repair team");

    await expect(saveHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(appendHostExpenses).toHaveBeenCalledWith([
      expect.objectContaining({
        hostId: "host-1",
        expenseDate: "2026-06-12",
        category: "Repairs",
        amount: 450,
        quantity: 2,
        unit: "SET",
        vendor: "Repair team",
      }),
    ]);
  });

  it("saves free inventory items with a zero unit amount", async () => {
    const formData = new FormData();
    formData.append("expenseDate", "2026-06-12");
    formData.append("category", "Office Supplies");
    formData.append("amount", "0");
    formData.append("quantity", "2");
    formData.append("unit", "pc");
    formData.append("vendor", "Free pillow");
    formData.append("description", "Free item for inventory record");

    await expect(saveHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(appendHostExpenses).toHaveBeenCalledWith([
      expect.objectContaining({
        hostId: "host-1",
        expenseDate: "2026-06-12",
        category: "Office Supplies",
        amount: 0,
        quantity: 2,
        unit: "PC",
        vendor: "Free pillow",
        description: "Free item for inventory record",
      }),
    ]);
  });

  it("saves a manually typed category", async () => {
    const formData = new FormData();
    formData.append("expenseDate", "2026-06-12");
    formData.append("category", "Pillow Freebies");
    formData.append("amount", "0");
    formData.append("quantity", "2");
    formData.append("unit", "pc");
    formData.append("vendor", "Free pillow");

    await expect(saveHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(appendHostExpenses).toHaveBeenCalledWith([
      expect.objectContaining({
        category: "Pillow Freebies",
        amount: 0,
        quantity: 2,
        unit: "PC",
        vendor: "Free pillow",
      }),
    ]);
  });

  it("imports expenses from a CSV template", async () => {
    const csv = [
      "\"DATE\",\"CATEGORY\",\"QUANTITY\",\"UNIT\",\"UNIT AMOUNT\",\"TOTAL AMOUNT\",\"SUPPLIER NAME\",\"RECEIPT NUMBER\",\"DESCRIPTION\"",
      "\"June 26, 2026\",\"Furniture & Fixtures\",\"4\",\"PC\",\"59.00\",\"236.00\",\"MR. DIY\",\"SI#0000-0000071003\",\"A4 Photo Frame\"",
      "\"2026-06-26\",\"Office Supplies\",\"1\",\"PC\",\"7.00\",\"7.00\",\"MR. DIY\",\"SI#0000-0000071003\",\"Eco Bag\"",
    ].join("\r\n");
    const formData = new FormData();
    formData.append("month", "2026-06");
    formData.append("expenseCsv", new File([csv], "expenses.csv", { type: "text/csv" }));

    await expect(importHostExpensesFromCsv(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06&expenseImported=2");

    expect(appendHostExpenses).toHaveBeenCalledWith([
      expect.objectContaining({
        hostId: "host-1",
        expenseDate: "2026-06-26",
        month: "2026-06",
        category: "Furniture & Fixtures",
        amount: 59,
        quantity: 4,
        unit: "PC",
        vendor: "MR. DIY",
        receiptReference: "SI#0000-0000071003",
        description: "A4 Photo Frame",
      }),
      expect.objectContaining({
        hostId: "host-1",
        expenseDate: "2026-06-26",
        month: "2026-06",
        category: "Office Supplies",
        amount: 7,
        quantity: 1,
        unit: "PC",
        vendor: "MR. DIY",
        receiptReference: "SI#0000-0000071003",
        description: "Eco Bag",
      }),
    ]);
  });

  it("rejects CSV imports that do not match the template", async () => {
    const formData = new FormData();
    formData.append("month", "2026-06");
    formData.append("expenseCsv", new File(["DATE,AMOUNT\r\n2026-06-26,10"], "expenses.csv", { type: "text/csv" }));

    await expect(importHostExpensesFromCsv(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06&expenseError=CSV+must+use+the+expense+template+headers");

    expect(appendHostExpenses).not.toHaveBeenCalled();
  });

  it("requires a category to be entered", async () => {
    const formData = new FormData();
    formData.append("expenseDate", "2026-06-12");
    formData.append("category", "");
    formData.append("amount", "0");
    formData.append("vendor", "Free pillow");

    await expect(saveHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06&expenseError=Enter+an+expense+category.");

    expect(appendHostExpenses).not.toHaveBeenCalled();
  });

  it("still requires a unit amount to be entered", async () => {
    const formData = new FormData();
    formData.append("expenseDate", "2026-06-12");
    formData.append("category", "Office Supplies");
    formData.append("amount", "");
    formData.append("vendor", "Free pillow");

    await expect(saveHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06&expenseError=Enter+a+unit+amount+of+0+or+higher.");

    expect(appendHostExpenses).not.toHaveBeenCalled();
  });

  it("requires quantity and unit to be submitted together", async () => {
    const formData = new FormData();
    formData.append("expenseDate", "2026-06-12");
    formData.append("category", "Office Supplies");
    formData.append("amount", "200");
    formData.append("quantity", "1");
    formData.append("vendor", "Trash can");

    await expect(saveHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(appendHostExpenses).not.toHaveBeenCalled();
  });

  it("updates an existing host expense", async () => {
    vi.mocked(readHostExpenses).mockResolvedValueOnce([
      {
        id: "expense-1",
        hostId: "host-1",
        expenseDate: "2026-06-01",
        month: "2026-06",
        category: "Cleaning Materials",
        amount: 100,
        vendor: "Old vendor",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ]);

    const formData = new FormData();
    formData.append("expenseId", "expense-1");
    formData.append("expenseDate", "2026-06-15");
    formData.append("category", "Office Supplies");
    formData.append("amount", "250");
    formData.append("quantity", "3");
    formData.append("unit", "box");
    formData.append("vendor", "Paper supplies");
    formData.append("receiptReference", "BILL-9");
    formData.append("description", "Updated bill");

    await expect(updateHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(replaceHostExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "expense-1",
        hostId: "host-1",
        expenseDate: "2026-06-15",
        month: "2026-06",
        category: "Office Supplies",
        amount: 250,
        quantity: 3,
        unit: "BOX",
        vendor: "Paper supplies",
        receiptReference: "BILL-9",
        description: "Updated bill",
      }),
    );
  });

  it("updates an existing expense to a zero unit amount", async () => {
    vi.mocked(readHostExpenses).mockResolvedValueOnce([
      {
        id: "expense-1",
        hostId: "host-1",
        expenseDate: "2026-06-01",
        month: "2026-06",
        category: "Office Supplies",
        amount: 100,
        vendor: "Old pillow",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ]);

    const formData = new FormData();
    formData.append("expenseId", "expense-1");
    formData.append("expenseDate", "2026-06-15");
    formData.append("category", "Office Supplies");
    formData.append("amount", "0");
    formData.append("quantity", "1");
    formData.append("unit", "pc");
    formData.append("vendor", "Free pillow");

    await expect(updateHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(replaceHostExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "expense-1",
        category: "Office Supplies",
        amount: 0,
        quantity: 1,
        unit: "PC",
        vendor: "Free pillow",
      }),
    );
  });

  it("updates an existing expense to a manually typed category", async () => {
    vi.mocked(readHostExpenses).mockResolvedValueOnce([
      {
        id: "expense-1",
        hostId: "host-1",
        expenseDate: "2026-06-01",
        month: "2026-06",
        category: "Office Supplies",
        amount: 100,
        vendor: "Old pillow",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ]);

    const formData = new FormData();
    formData.append("expenseId", "expense-1");
    formData.append("expenseDate", "2026-06-15");
    formData.append("category", "Pillow Freebies");
    formData.append("amount", "0");
    formData.append("quantity", "1");
    formData.append("unit", "pc");
    formData.append("vendor", "Free pillow");

    await expect(updateHostExpense(formData)).rejects.toThrow("NEXT_REDIRECT:/host/reports?month=2026-06");

    expect(replaceHostExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "expense-1",
        category: "Pillow Freebies",
        amount: 0,
        quantity: 1,
        unit: "PC",
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
        category: "Cleaning Materials",
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

  it("uses the expense date month when deleting restored expenses", async () => {
    vi.mocked(readHostExpenses).mockResolvedValueOnce([
      {
        id: "expense-1",
        hostId: "host-1",
        expenseDate: "2026-06-26",
        month: "2026-07",
        category: "Furniture & Fixtures",
        amount: 59,
        vendor: "MR. DIY",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    const formData = new FormData();
    formData.append("expenseId", "expense-1");
    formData.append("month", "2026-07");

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
