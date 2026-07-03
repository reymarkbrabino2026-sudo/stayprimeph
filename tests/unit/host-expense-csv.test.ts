import { describe, expect, it } from "vitest";

import { hostExpenseReportMonth, hostExpensesToCsv, hostExpenseTotal, parseHostExpensesCsv } from "@/lib/host-expense-csv";
import type { HostExpense } from "@/lib/types";

describe("host expense csv export", () => {
  it("exports expenses using the inventory template columns", () => {
    const csv = hostExpensesToCsv([
      {
        id: "expense-1",
        hostId: "host-1",
        expenseDate: "2026-07-02",
        month: "2026-07",
        category: "Cleaning Materials",
        quantity: 2,
        unit: "PC",
        amount: 200,
        vendor: "S&R",
        receiptReference: "12345",
        description: "MOP",
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z",
      },
    ]);

    expect(csv.split("\r\n")).toEqual([
      "\"DATE\",\"CATEGORY\",\"QUANTITY\",\"UNIT\",\"UNIT AMOUNT\",\"TOTAL AMOUNT\",\"SUPPLIER NAME\",\"RECEIPT NUMBER\",\"DESCRIPTION\"",
      "\"July 2, 2026\",\"Cleaning Materials\",\"2\",\"PC\",\"200.00\",\"400.00\",\"S&R\",\"12345\",\"MOP\"",
    ]);
  });

  it("keeps legacy expenses as one total unit when quantity is blank", () => {
    const expense = {
      amount: 350,
    } as Pick<HostExpense, "amount" | "quantity">;

    expect(hostExpenseTotal(expense)).toBe(350);
  });

  it("exports free inventory items with zero amounts", () => {
    const csv = hostExpensesToCsv([
      {
        id: "expense-free",
        hostId: "host-1",
        expenseDate: "2026-07-02",
        month: "2026-07",
        category: "Office Supplies",
        quantity: 2,
        unit: "PC",
        amount: 0,
        vendor: "Free pillow",
        description: "Inventory record",
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z",
      },
    ]);

    expect(hostExpenseTotal({ amount: 0, quantity: 2 })).toBe(0);
    expect(csv.split("\r\n")[1]).toBe("\"July 2, 2026\",\"Office Supplies\",\"2\",\"PC\",\"0.00\",\"0.00\",\"Free pillow\",\"\",\"Inventory record\"");
  });

  it("uses the expense date month before the stored month", () => {
    expect(hostExpenseReportMonth({ expenseDate: "2026-06-26", month: "2026-07" })).toBe("2026-06");
    expect(hostExpenseReportMonth({ expenseDate: "", month: "2026-07" })).toBe("2026-07");
  });

  it("imports expenses from the exported CSV template", () => {
    const csv = [
      "\"DATE\",\"CATEGORY\",\"QUANTITY\",\"UNIT\",\"UNIT AMOUNT\",\"TOTAL AMOUNT\",\"SUPPLIER NAME\",\"RECEIPT NUMBER\",\"DESCRIPTION\"",
      "\"July 2, 2026\",\"Office Supplies\",\"2\",\"PC\",\"0.00\",\"0.00\",\"Free pillow\",\"\",\"Inventory record\"",
      "\"6/26/2026\",\"Furniture & Fixtures\",\"4\",\"pc\",\"59.00\",\"236.00\",\"MR. DIY\",\"SI#0000-0000071003\",\"A4 Photo Frame\"",
    ].join("\r\n");

    expect(parseHostExpensesCsv(csv)).toEqual([
      {
        expenseDate: "2026-07-02",
        month: "2026-07",
        category: "Office Supplies",
        quantity: 2,
        unit: "PC",
        amount: 0,
        vendor: "Free pillow",
        description: "Inventory record",
      },
      {
        expenseDate: "2026-06-26",
        month: "2026-06",
        category: "Furniture & Fixtures",
        quantity: 4,
        unit: "PC",
        amount: 59,
        vendor: "MR. DIY",
        receiptReference: "SI#0000-0000071003",
        description: "A4 Photo Frame",
      },
    ]);
  });

  it("rejects files that do not use the expense template headers", () => {
    expect(() => parseHostExpensesCsv("\"Date\",\"Amount\"\r\n\"2026-07-02\",\"10\""))
      .toThrow("CSV must use the expense template headers");
  });

  it("rejects rows where total amount does not match quantity", () => {
    const csv = [
      "\"DATE\",\"CATEGORY\",\"QUANTITY\",\"UNIT\",\"UNIT AMOUNT\",\"TOTAL AMOUNT\",\"SUPPLIER NAME\",\"RECEIPT NUMBER\",\"DESCRIPTION\"",
      "\"2026-07-02\",\"Office Supplies\",\"2\",\"PC\",\"10.00\",\"30.00\",\"Store\",\"\",\"\"",
    ].join("\r\n");

    expect(() => parseHostExpensesCsv(csv)).toThrow("Row 2: Total amount must match unit amount multiplied by quantity.");
  });
});
