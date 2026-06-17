import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { HostExpense } from "@/lib/types";

const storeFileName = "host-expenses.json";

export async function readHostExpenses(): Promise<HostExpense[]> {
  return readJsonStore<HostExpense>(storeFileName);
}

export async function writeHostExpenses(expenses: HostExpense[]) {
  await writeJsonStore(storeFileName, expenses);
}
