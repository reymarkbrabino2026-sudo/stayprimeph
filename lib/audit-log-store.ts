import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { AuditLog } from "@/lib/types";

const storeFileName = "audit-logs.json";

export async function readStoredAuditLogs(): Promise<AuditLog[]> {
  return readJsonStore<AuditLog>(storeFileName);
}

export async function writeStoredAuditLogs(logs: AuditLog[]) {
  await writeJsonStore(storeFileName, logs);
}
