import { describe, expect, it } from "vitest";

import { hostExpensesToCsv, hostExpenseTotal } from "@/lib/host-expense-csv";
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
});
