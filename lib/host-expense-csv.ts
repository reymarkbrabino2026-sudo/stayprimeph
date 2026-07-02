import type { HostExpense } from "@/lib/types";

export const hostExpenseCsvHeaders = [
  "DATE",
  "CATEGORY",
  "QUANTITY",
  "UNIT",
  "UNIT AMOUNT",
  "TOTAL AMOUNT",
  "SUPPLIER NAME",
  "RECEIPT NUMBER",
  "DESCRIPTION",
];

export function hostExpenseTotal(expense: Pick<HostExpense, "amount" | "quantity">) {
  return Math.round(expense.amount * (expense.quantity ?? 1) * 100) / 100;
}

function csvCell(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function csvAmount(value: number) {
  return value.toFixed(2);
}

function csvDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function hostExpensesToCsv(expenses: HostExpense[]) {
  const rows = expenses.map((expense) => [
    csvDate(expense.expenseDate),
    expense.category,
    expense.quantity,
    expense.unit,
    csvAmount(expense.amount),
    csvAmount(hostExpenseTotal(expense)),
    expense.vendor,
    expense.receiptReference,
    expense.description,
  ]);

  return [
    hostExpenseCsvHeaders.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
}
