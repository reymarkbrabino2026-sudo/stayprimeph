import "server-only";

import { randomUUID } from "node:crypto";
import { readStoredAuditLogs, writeStoredAuditLogs } from "@/lib/audit-log-store";
import { appendAuditLogInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import type { AuditLog, AuditLogAction } from "@/lib/types";

type AuditInput = {
  actorId: string;
  actorRole: AuditLog["actorRole"];
  action: AuditLogAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export async function appendAuditLog(input: AuditInput) {
  const auditLog: AuditLog = {
    id: randomUUID(),
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };

  if (usesPrismaPersistence()) {
    await appendAuditLogInDatabase(auditLog);
    return auditLog;
  }

  const logs = await readStoredAuditLogs();
  await writeStoredAuditLogs([auditLog, ...logs]);
  return auditLog;
}
