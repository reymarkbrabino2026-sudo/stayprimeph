"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { csrfFieldName } from "@/lib/csrf-fields";

type HostExpenseFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: string[];
  csrfToken: string;
  defaultDate: string;
  defaultOpen?: boolean;
  hostOptions?: Array<{ id: string; name: string }>;
};

type ExpenseRow = {
  amount: string;
  id: string;
  name: string;
  quantity: string;
};

const initialRows = [{ amount: "", id: "initial-expense", name: "", quantity: "" }];
const unitOptions = ["PC", "SET", "PACK", "BOX", "BOTTLE", "ROLL", "KG", "L", "HR"];

function positiveNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function lineTotal(amount: string, quantity: string) {
  const amountValue = positiveNumber(amount);
  const quantityValue = positiveNumber(quantity) || 1;
  return Math.round(amountValue * quantityValue * 100) / 100;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

export function HostExpenseForm({ action, categories, csrfToken, defaultDate, defaultOpen = false, hostOptions = [] }: HostExpenseFormProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [rows, setRows] = useState<ExpenseRow[]>(initialRows);
  const saveLabel = rows.length === 1 ? "Save expense" : `Save ${rows.length} expenses`;

  if (!isOpen) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#21170f] px-5 font-semibold text-white transition hover:bg-[#21170f]/90"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add expense
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-4 grid gap-4">
      <input type="hidden" name={csrfFieldName} value={csrfToken} />
      <datalist id="expense-unit-options">
        {unitOptions.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      {hostOptions.length > 0 ? (
        <label className="grid max-w-md gap-2 text-sm font-semibold text-black/70">
          Host
          <select name="hostId" className="min-h-12 rounded-2xl border px-4 font-normal text-black" required>
            <option value="">Choose host</option>
            {hostOptions.map((host) => (
              <option key={host.id} value={host.id}>{host.name}</option>
            ))}
          </select>
        </label>
      ) : null}

      {rows.map((row) => {
        const rowTitle = row.name.trim() || "New expense";
        return (
        <fieldset key={row.id} className="rounded-[1.25rem] border border-black/10 bg-[#fbfaf8] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <legend className="truncate text-sm font-bold text-black/70">{rowTitle}</legend>
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                className="grid size-10 place-items-center rounded-full border border-black/10 text-black/55 transition hover:border-[#d85d32]/35 hover:text-[#d85d32]"
                aria-label={`Remove ${rowTitle}`}
                title="Remove expense"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-2">
              Expense date
              <input name="expenseDate" type="date" defaultValue={defaultDate} className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-2">
              Category
              <select name="category" className="min-h-12 rounded-2xl border px-4 font-normal text-black" required>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-2">
              Unit amount
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="200.00"
                className="min-h-12 rounded-2xl border px-4 font-normal text-black"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setRows((current) => current.map((item) => item.id === row.id ? { ...item, amount: value } : item));
                }}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-2">
              Quantity
              <input
                name="quantity"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="1"
                className="min-h-12 rounded-2xl border px-4 font-normal text-black"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setRows((current) => current.map((item) => item.id === row.id ? { ...item, quantity: value } : item));
                }}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-2">
              Unit
              <input name="unit" type="text" list="expense-unit-options" maxLength={30} placeholder="PC" className="min-h-12 rounded-2xl border px-4 font-normal uppercase text-black" />
            </label>
            <div className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-2">
              <span>Total amount</span>
              <output className="grid min-h-12 place-items-center rounded-2xl border border-black/10 bg-white px-4 text-right font-bold text-black">
                {formatCurrency(lineTotal(row.amount, row.quantity))}
              </output>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-4">
              Supplier or item
              <input
                name="vendor"
                type="text"
                maxLength={120}
                placeholder="S&R, trash can, contractor, utility company"
                className="min-h-12 rounded-2xl border px-4 font-normal text-black"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setRows((current) => current.map((item) => item.id === row.id ? { ...item, name: value } : item));
                }}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-4">
              Receipt number
              <input name="receiptReference" type="text" maxLength={180} placeholder="12345, invoice, or payment reference" className="min-h-12 rounded-2xl border px-4 font-normal text-black" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-12">
              Description
              <textarea name="description" rows={2} maxLength={500} className="rounded-2xl border px-4 py-3 font-normal text-black" placeholder="MOP, trash can, cleaning refill, office supplies" />
            </label>
          </div>
        </fieldset>
        );
      })}

      <button
        type="button"
        onClick={() => setRows((current) => [...current, { amount: "", id: `expense-${Date.now()}-${current.length}`, name: "", quantity: "" }])}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-black/10 px-5 font-semibold text-black/65 transition hover:border-black/25 hover:text-black sm:w-fit"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add another expense
      </button>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            setRows(initialRows);
            setIsOpen(false);
          }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-black/10 px-5 font-semibold text-black/65 transition hover:border-black/25 hover:text-black"
        >
          <X className="size-4" aria-hidden="true" />
          Cancel
        </button>
        <button className="min-h-12 rounded-full bg-[#0b8d65] px-6 font-semibold text-white transition hover:bg-[#076c4d] sm:w-fit">
          {saveLabel}
        </button>
      </div>
    </form>
  );
}
