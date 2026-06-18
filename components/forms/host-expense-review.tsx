"use client";

import { AlertTriangle, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { csrfFieldName } from "@/lib/csrf-fields";
import type { HostExpense } from "@/lib/types";

type HostExpenseReviewProps = {
  categories: string[];
  csrfToken: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
  expenses: Array<HostExpense & { hostName?: string }>;
  isAdmin: boolean;
  updateAction: (formData: FormData) => void | Promise<void>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function displayDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString();
}

export function HostExpenseReview({ categories, csrfToken, deleteAction, expenses, isAdmin, updateAction }: HostExpenseReviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingExpense, setConfirmingExpense] = useState<HostExpense | null>(null);

  useEffect(() => {
    if (!confirmingExpense) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmingExpense(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmingExpense]);

  if (expenses.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-black/15 bg-[#fbfaf8] p-5 text-center text-sm text-black/55">
        Add your first manual expense above.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-black/10">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#fbf7f2] text-black/55">
            <tr>
              {isAdmin ? <th className="px-4 py-3 font-medium">Host</th> : null}
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Receipt</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-t border-black/10 align-top">
                {editingId === expense.id ? (
                  <td colSpan={isAdmin ? 8 : 7} className="bg-white p-4">
                    <EditExpenseForm categories={categories} csrfToken={csrfToken} expense={expense} isAdmin={isAdmin} onCancel={() => setEditingId(null)} updateAction={updateAction} />
                  </td>
                ) : (
                  <>
                    {isAdmin ? <td className="px-4 py-4">{expense.hostName ?? "Host"}</td> : null}
                    <td className="px-4 py-4">{displayDate(expense.expenseDate)}</td>
                    <td className="px-4 py-4">{expense.category}</td>
                    <td className="px-4 py-4">{expense.vendor}</td>
                    <td className="px-4 py-4">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-4">{expense.receiptReference ?? "None"}</td>
                    <td className="px-4 py-4">{expense.description ?? "None"}</td>
                    <td className="px-4 py-3">
                      <RowActions onDelete={() => setConfirmingExpense(expense)} onEdit={() => setEditingId(expense.id)} />
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {expenses.map((expense) => (
          <article key={expense.id} className="rounded-[1rem] border border-black/10 bg-[#fbfaf8] p-4">
            {editingId === expense.id ? (
              <EditExpenseForm categories={categories} csrfToken={csrfToken} expense={expense} isAdmin={isAdmin} onCancel={() => setEditingId(null)} updateAction={updateAction} />
            ) : (
              <div className="grid gap-3">
                {isAdmin ? <ExpenseDetail label="Host" value={expense.hostName ?? "Host"} /> : null}
                <ExpenseDetail label="Date" value={displayDate(expense.expenseDate)} />
                <ExpenseDetail label="Category" value={expense.category} />
                <ExpenseDetail label="Vendor" value={expense.vendor} />
                <ExpenseDetail label="Amount" value={formatCurrency(expense.amount)} />
                <ExpenseDetail label="Receipt" value={expense.receiptReference ?? "None"} />
                <ExpenseDetail label="Notes" value={expense.description ?? "None"} />
                <RowActions onDelete={() => setConfirmingExpense(expense)} onEdit={() => setEditingId(expense.id)} />
              </div>
            )}
          </article>
        ))}
      </div>

      {confirmingExpense ? (
        <DeleteExpenseDialog
          action={deleteAction}
          csrfToken={csrfToken}
          expense={confirmingExpense}
          onClose={() => setConfirmingExpense(null)}
        />
      ) : null}
    </div>
  );
}

function ExpenseDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="font-semibold text-black/45">{label}</span>
      <span className="max-w-[65%] text-right font-medium text-black">{value}</span>
    </div>
  );
}

function RowActions({
  onDelete,
  onEdit,
}: {
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 px-4 font-semibold text-black transition hover:border-black/25"
      >
        <Pencil className="size-4" aria-hidden="true" />
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#d85d32]/25 px-4 font-semibold text-[#9b3b1d] transition hover:bg-[#fff3ed]"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Delete
      </button>
    </div>
  );
}

function DeleteExpenseDialog({
  action,
  csrfToken,
  expense,
  onClose,
}: {
  action: (formData: FormData) => void | Promise<void>;
  csrfToken: string;
  expense: HostExpense;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        role="dialog"
        aria-labelledby="delete-expense-title"
        className="w-full max-w-md overflow-hidden rounded-[1.5rem] bg-white shadow-2xl shadow-black/25"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4 border-b border-black/10 bg-[#fff8f3] p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ffe1d3] text-[#a9441f]">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9b3b1d]/70">Confirm delete</p>
            <h2 id="delete-expense-title" className="mt-1 text-xl font-bold text-black">Delete this expense?</h2>
            <p className="mt-2 text-sm leading-6 text-black/60">
              This will remove the {expense.category.toLowerCase()} entry for {formatCurrency(expense.amount)} from your manual expenses.
            </p>
          </div>
        </div>

        <form action={action} className="grid gap-4 p-5">
          <input type="hidden" name={csrfFieldName} value={csrfToken} />
          <input type="hidden" name="expenseId" value={expense.id} />
          <input type="hidden" name="month" value={expense.month} />
          <div className="rounded-2xl border border-black/10 bg-[#fbfaf8] p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-black">{expense.vendor}</span>
              <span className="font-bold text-black">{formatCurrency(expense.amount)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-black/55">
              <span>{displayDate(expense.expenseDate)}</span>
              <span>{expense.receiptReference ?? "No receipt"}</span>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-5 font-semibold text-black/65 transition hover:border-black/25 hover:text-black"
            >
              Cancel
            </button>
            <DeleteSubmitButton />
          </div>
        </form>
      </section>
    </div>
  );
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9b3b1d] px-5 font-semibold text-white transition hover:bg-[#7e2f16] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
      {pending ? "Deleting..." : "Delete expense"}
    </button>
  );
}

function EditExpenseForm({
  categories,
  csrfToken,
  expense,
  isAdmin,
  onCancel,
  updateAction,
}: {
  categories: string[];
  csrfToken: string;
  expense: HostExpense & { hostName?: string };
  isAdmin: boolean;
  onCancel: () => void;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={updateAction} className="grid gap-3">
      <input type="hidden" name={csrfFieldName} value={csrfToken} />
      <input type="hidden" name="expenseId" value={expense.id} />
      {isAdmin ? (
        <p className="text-sm font-semibold text-black/55">Editing expense for {expense.hostName ?? "Host"}</p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-12">
        <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-2">
          Expense date
          <input name="expenseDate" type="date" defaultValue={expense.expenseDate} className="min-h-11 rounded-2xl border px-4 font-normal text-black" required />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-2">
          Category
          <select name="category" defaultValue={expense.category} className="min-h-11 rounded-2xl border px-4 font-normal text-black" required>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-2">
          Amount
          <input name="amount" type="number" min="0.01" step="0.01" defaultValue={expense.amount} className="min-h-11 rounded-2xl border px-4 font-normal text-black" required />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-3">
          Expense name or vendor
          <input name="vendor" type="text" maxLength={120} defaultValue={expense.vendor} className="min-h-11 rounded-2xl border px-4 font-normal text-black" required />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-3">
          Receipt reference
          <input name="receiptReference" type="text" maxLength={180} defaultValue={expense.receiptReference} className="min-h-11 rounded-2xl border px-4 font-normal text-black" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-black/70 lg:col-span-12">
          Description
          <textarea name="description" rows={2} maxLength={500} defaultValue={expense.description} className="rounded-2xl border px-4 py-3 font-normal text-black" />
        </label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="min-h-11 rounded-full bg-[#0b8d65] px-5 font-semibold text-white transition hover:bg-[#076c4d]">
          Save changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 px-5 font-semibold text-black/65 transition hover:border-black/25 hover:text-black"
        >
          <X className="size-4" aria-hidden="true" />
          Cancel
        </button>
      </div>
    </form>
  );
}
