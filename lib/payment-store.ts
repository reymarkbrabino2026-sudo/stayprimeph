import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { Payment } from "@/lib/types";

const storeFileName = "payments.json";

export async function readStoredPayments(): Promise<Payment[]> {
  return readJsonStore<Payment>(storeFileName);
}

export async function writeStoredPayments(payments: Payment[]) {
  await writeJsonStore(storeFileName, payments);
}
