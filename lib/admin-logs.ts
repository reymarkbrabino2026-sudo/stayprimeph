import "server-only";

import { randomUUID } from "node:crypto";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { appendAdminLogInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import type { AdminLog } from "@/lib/types";

type AdminLogInput = {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
};

const storeFileName = "admin-logs.json";

export async function appendAdminLog(input: AdminLogInput) {
  const adminLog: AdminLog = {
    id: randomUUID(),
    adminId: input.adminId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    createdAt: new Date().toISOString(),
  };

  if (usesPrismaPersistence()) {
    await appendAdminLogInDatabase(adminLog);
    return adminLog;
  }

  const logs = await readJsonStore<AdminLog>(storeFileName);
  await writeJsonStore(storeFileName, [adminLog, ...logs]);
  return adminLog;
}
