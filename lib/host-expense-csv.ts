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

export function hostExpenseReportMonth(expense: Pick<HostExpense, "expenseDate" | "month">) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(expense.expenseDate)) return expense.expenseDate.slice(0, 7);
  return expense.month;
}

export type HostExpenseCsvImportRow = Pick<
  HostExpense,
  "amount" | "category" | "description" | "expenseDate" | "month" | "quantity" | "receiptReference" | "unit" | "vendor"
>;

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

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" || char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && next === "\n") index += 1;
    } else {
      cell += char;
    }
  }

  if (inQuotes) throw new Error("CSV has an unclosed quoted cell.");
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toUpperCase();
}

function cleanText(value: string | undefined, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function rowError(rowNumber: number, message: string) {
  return new Error(`Row ${rowNumber}: ${message}`);
}

function parseAmountCell(value: string | undefined) {
  const text = String(value ?? "")
    .trim()
    .replace(/^PHP\s*/i, "")
    .replace(/[₱,\s]/g, "");
  if (!text) return null;

  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

function parseQuantityCell(value: string | undefined) {
  const text = String(value ?? "").trim();
  if (!text || text.toLowerCase() === "none") return undefined;

  const quantity = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return Math.round(quantity * 100) / 100;
}

function parseExpenseDate(value: string | undefined) {
  const text = String(value ?? "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return validDate(Number(slash[3]), Number(slash[1]), Number(slash[2]));

  const monthName = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (monthName) {
    const month = monthNames.indexOf(monthName[1].toLowerCase()) + 1;
    if (month > 0) return validDate(Number(monthName[3]), month, Number(monthName[2]));
  }

  return null;
}

const monthNames = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

export function parseHostExpensesCsv(text: string): HostExpenseCsvImportRow[] {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length === 0) throw new Error("CSV file is empty.");

  const headers = rows[0].map(normalizeHeader);
  const expectedHeaders = hostExpenseCsvHeaders.map(normalizeHeader);
  if (headers.length !== expectedHeaders.length || headers.some((header, index) => header !== expectedHeaders[index])) {
    throw new Error(`CSV must use the expense template headers: ${hostExpenseCsvHeaders.join(", ")}.`);
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) throw new Error("CSV does not contain any expense rows.");
  if (dataRows.length > 500) throw new Error("CSV can import up to 500 expense rows at a time.");

  return dataRows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    if (row.length > hostExpenseCsvHeaders.length && row.slice(hostExpenseCsvHeaders.length).some((cell) => cell.trim())) {
      throw rowError(rowNumber, "Remove extra columns before importing.");
    }

    const cells = [...row];
    while (cells.length < hostExpenseCsvHeaders.length) cells.push("");

    const expenseDate = parseExpenseDate(cells[0]);
    if (!expenseDate) throw rowError(rowNumber, "Enter a valid date.");

    const category = cleanText(cells[1], 40);
    if (!category) throw rowError(rowNumber, "Enter an expense category.");

    const quantity = parseQuantityCell(cells[2]);
    if (quantity === null) throw rowError(rowNumber, "Enter a valid quantity greater than zero.");

    const unit = cleanText(cells[3], 30).toUpperCase();
    if ((quantity !== undefined && !unit) || (quantity === undefined && unit)) {
      throw rowError(rowNumber, "Enter both quantity and unit, or leave both blank.");
    }

    const amount = parseAmountCell(cells[4]);
    if (amount === null) throw rowError(rowNumber, "Enter a unit amount of 0 or higher.");

    const totalAmount = parseAmountCell(cells[5]);
    const expectedTotal = hostExpenseTotal({ amount, quantity });
    if (totalAmount !== null && Math.abs(totalAmount - expectedTotal) > 0.01) {
      throw rowError(rowNumber, "Total amount must match unit amount multiplied by quantity.");
    }

    const vendor = cleanText(cells[6], 120);
    if (!vendor) throw rowError(rowNumber, "Enter a supplier name.");

    return {
      expenseDate,
      month: expenseDate.slice(0, 7),
      category,
      amount,
      quantity,
      unit: unit || undefined,
      vendor,
      receiptReference: cleanText(cells[7], 180) || undefined,
      description: cleanText(cells[8], 500) || undefined,
    };
  });
}
