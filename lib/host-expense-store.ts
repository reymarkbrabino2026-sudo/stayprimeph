import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import {
  createHostExpensesInDatabase,
  deleteHostExpenseFromDatabase,
  listHostExpensesFromDatabase,
  updateHostExpenseInDatabase,
  usesPrismaPersistence,
  writeHostExpensesToDatabase,
} from "@/lib/repositories";
import type { HostExpense } from "@/lib/types";

const storeFileName = "host-expenses.json";

export async function readHostExpenses(): Promise<HostExpense[]> {
  if (usesPrismaPersistence()) return listHostExpensesFromDatabase();
  return readJsonStore<HostExpense>(storeFileName);
}

export async function writeHostExpenses(expenses: HostExpense[]) {
  if (usesPrismaPersistence()) {
    await writeHostExpensesToDatabase(expenses);
    return;
  }
  await writeJsonStore(storeFileName, expenses);
}

export async function appendHostExpenses(nextExpenses: HostExpense[]) {
  if (nextExpenses.length === 0) return;
  if (usesPrismaPersistence()) {
    await createHostExpensesInDatabase(nextExpenses);
    return;
  }

  const expenses = await readJsonStore<HostExpense>(storeFileName);
  await writeJsonStore(storeFileName, [...nextExpenses, ...expenses]);
}

export async function replaceHostExpense(updatedExpense: HostExpense) {
  if (usesPrismaPersistence()) {
    await updateHostExpenseInDatabase(updatedExpense);
    return;
  }

  const expenses = await readJsonStore<HostExpense>(storeFileName);
  await writeJsonStore(
    storeFileName,
    expenses.map((expense) => expense.id === updatedExpense.id ? updatedExpense : expense),
  );
}

export async function removeHostExpense(expenseId: string) {
  if (usesPrismaPersistence()) {
    await deleteHostExpenseFromDatabase(expenseId);
    return;
  }

  const expenses = await readJsonStore<HostExpense>(storeFileName);
  await writeJsonStore(storeFileName, expenses.filter((expense) => expense.id !== expenseId));
}
