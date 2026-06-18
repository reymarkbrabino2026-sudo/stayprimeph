import "server-only";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { logger } from "@/lib/logger";
import type { AuditLog, Message, Property, Report, User } from "@/lib/types";

const dayMs = 24 * 60 * 60 * 1000;

export const retentionRules = {
  messagesDays: 730,
  supportMessagesDays: 365,
  closedSupportReportsDays: 1095,
  adminLogsDays: 365,
  auditLogsDays: 2555,
  unpublishedDraftsDays: 30,
} as const;

const closedSupportReportStatuses = new Set(["closed", "resolved", "dismissed", "rejected"]);
const immutableAuditLogActions = new Set([
  "listing.approved",
  "listing.rejected",
  "payment.approved",
  "payment.rejected",
  "payment.refunded",
  "account.anonymized",
]);

export type RetentionPruneResult = {
  messages: number;
  supportMessages: number;
  supportReports: number;
  adminLogs: number;
  auditLogs: number;
  unpublishedDrafts: number;
};

const emptyResult: RetentionPruneResult = {
  messages: 0,
  supportMessages: 0,
  supportReports: 0,
  adminLogs: 0,
  auditLogs: 0,
  unpublishedDrafts: 0,
};

let lastRetentionRunKey: string | null = null;

function cutoff(now: Date, days: number) {
  return new Date(now.getTime() - days * dayMs);
}

function timestamp(value: unknown) {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function olderThan(value: unknown, cutoffDate: Date) {
  const parsed = timestamp(value);
  return parsed !== null && parsed < cutoffDate.getTime();
}

function isClosedSupportReport(report: Pick<Report, "status">) {
  return closedSupportReportStatuses.has(report.status.trim().toLowerCase());
}

function isSupportMessage(message: Message, adminIds: Set<string>) {
  return adminIds.has(message.senderId) || adminIds.has(message.receiverId);
}

function retainedMessages(messages: Message[], users: User[], now: Date) {
  const messageCutoff = cutoff(now, retentionRules.messagesDays);
  const supportCutoff = cutoff(now, retentionRules.supportMessagesDays);
  const adminIds = new Set(users.filter((user) => user.role === "admin").map((user) => user.id));
  let supportMessages = 0;
  let messagesCount = 0;

  const retained = messages.filter((message) => {
    if (isSupportMessage(message, adminIds) && olderThan(message.createdAt, supportCutoff)) {
      supportMessages += 1;
      return false;
    }
    if (olderThan(message.createdAt, messageCutoff)) {
      messagesCount += 1;
      return false;
    }
    return true;
  });

  return { retained, messages: messagesCount, supportMessages };
}

function retainedClosedSupportReports(reports: Report[], now: Date) {
  const reportCutoff = cutoff(now, retentionRules.closedSupportReportsDays);
  let supportReports = 0;
  const retained = reports.filter((report) => {
    if (isClosedSupportReport(report) && olderThan(report.createdAt, reportCutoff)) {
      supportReports += 1;
      return false;
    }
    return true;
  });
  return { retained, supportReports };
}

function retainedDatedRecords<T extends { createdAt?: unknown }>(records: T[], cutoffDate: Date) {
  let deleted = 0;
  const retained = records.filter((record) => {
    if (olderThan(record.createdAt, cutoffDate)) {
      deleted += 1;
      return false;
    }
    return true;
  });
  return { retained, deleted };
}

function retainedAuditLogs(auditLogs: AuditLog[], cutoffDate: Date) {
  let deleted = 0;
  const retained = auditLogs.filter((auditLog) => {
    if (immutableAuditLogActions.has(auditLog.action)) return true;
    if (olderThan(auditLog.createdAt, cutoffDate)) {
      deleted += 1;
      return false;
    }
    return true;
  });
  return { retained, deleted };
}

function retainedUnpublishedDrafts(properties: Property[], now: Date) {
  const draftCutoff = cutoff(now, retentionRules.unpublishedDraftsDays);
  let unpublishedDrafts = 0;
  const retained = properties.filter((property) => {
    if (property.status === "draft" && olderThan(property.createdAt, draftCutoff)) {
      unpublishedDrafts += 1;
      return false;
    }
    return true;
  });
  return { retained, unpublishedDrafts };
}

async function enforceJsonRetention(now: Date): Promise<RetentionPruneResult> {
  const result = { ...emptyResult };

  const [users, messages, reports, adminLogs, auditLogs, properties] = await Promise.all([
    readJsonStore<User>("users.json"),
    readJsonStore<Message>("messages.json"),
    readJsonStore<Report>("reports.json"),
    readJsonStore<{ createdAt?: unknown }>("admin-logs.json"),
    readJsonStore<AuditLog>("audit-logs.json"),
    readJsonStore<Property>("properties.json"),
  ]);

  const prunedMessages = retainedMessages(messages, users, now);
  result.messages = prunedMessages.messages;
  result.supportMessages = prunedMessages.supportMessages;
  if (result.messages || result.supportMessages) await writeJsonStore("messages.json", prunedMessages.retained);

  const prunedReports = retainedClosedSupportReports(reports, now);
  result.supportReports = prunedReports.supportReports;
  if (result.supportReports) await writeJsonStore("reports.json", prunedReports.retained);

  const prunedAdminLogs = retainedDatedRecords(adminLogs, cutoff(now, retentionRules.adminLogsDays));
  result.adminLogs = prunedAdminLogs.deleted;
  if (result.adminLogs) await writeJsonStore("admin-logs.json", prunedAdminLogs.retained);

  const prunedAuditLogs = retainedAuditLogs(auditLogs, cutoff(now, retentionRules.auditLogsDays));
  result.auditLogs = prunedAuditLogs.deleted;
  if (result.auditLogs) await writeJsonStore("audit-logs.json", prunedAuditLogs.retained);

  const prunedDrafts = retainedUnpublishedDrafts(properties, now);
  result.unpublishedDrafts = prunedDrafts.unpublishedDrafts;
  if (result.unpublishedDrafts) await writeJsonStore("properties.json", prunedDrafts.retained);

  return result;
}

async function enforcePrismaRetention(now: Date): Promise<RetentionPruneResult> {
  const supportMessages = await prisma.message.deleteMany({
    where: {
      createdAt: { lt: cutoff(now, retentionRules.supportMessagesDays) },
      OR: [
        { sender: { role: "admin" } },
        { receiver: { role: "admin" } },
      ],
    },
  });
  const messages = await prisma.message.deleteMany({
    where: { createdAt: { lt: cutoff(now, retentionRules.messagesDays) } },
  });
  const supportReports = await prisma.report.deleteMany({
    where: {
      createdAt: { lt: cutoff(now, retentionRules.closedSupportReportsDays) },
      status: { in: [...closedSupportReportStatuses] },
    },
  });
  const adminLogs = await prisma.adminLog.deleteMany({
    where: { createdAt: { lt: cutoff(now, retentionRules.adminLogsDays) } },
  });
  const auditLogs = await prisma.$executeRaw`
    DELETE FROM "AuditLog"
    WHERE "createdAt" < ${cutoff(now, retentionRules.auditLogsDays)}
      AND "action" NOT IN (
        'listing.approved',
        'listing.rejected',
        'payment.approved',
        'payment.rejected',
        'payment.refunded',
        'account.anonymized'
      )
  `;
  const unpublishedDrafts = await prisma.property.deleteMany({
    where: {
      status: "draft",
      createdAt: { lt: cutoff(now, retentionRules.unpublishedDraftsDays) },
    },
  });

  return {
    messages: messages.count,
    supportMessages: supportMessages.count,
    supportReports: supportReports.count,
    adminLogs: adminLogs.count,
    auditLogs,
    unpublishedDrafts: unpublishedDrafts.count,
  };
}

export async function enforceDataRetention(now = new Date()) {
  return env.PERSISTENCE_DRIVER === "prisma" ? enforcePrismaRetention(now) : enforceJsonRetention(now);
}

export async function enforceDataRetentionOncePerDay(now = new Date()) {
  const runKey = now.toISOString().slice(0, 10);
  if (lastRetentionRunKey === runKey) return null;
  lastRetentionRunKey = runKey;

  try {
    return await enforceDataRetention(now);
  } catch (error) {
    lastRetentionRunKey = null;
    logger.warn("data_retention_failed", {
      error: error instanceof Error ? error.message : "Unknown retention error",
    });
    return null;
  }
}
