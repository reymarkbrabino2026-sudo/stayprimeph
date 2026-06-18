import "server-only";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { readJsonStore } from "@/lib/json-store";
import { getUsers } from "@/lib/users";
import type { NotificationChannels, NotificationPreferencesState, NotificationScope } from "@/lib/account-settings-types";

export type NotificationEmailKind = "essential" | "account" | "marketing";

type StoredAccountSettings = {
  userId: string;
  notifications?: unknown;
};

type NotificationConsentInput = {
  to: string;
  kind: NotificationEmailKind;
  scope?: NotificationScope;
  preferenceId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeChannels(value: unknown, defaultOn: boolean): NotificationChannels {
  const fallback = { email: defaultOn, push: defaultOn, sms: false };
  if (!isRecord(value)) return fallback;
  return {
    email: normalizeBoolean(value.email, fallback.email),
    push: normalizeBoolean(value.push, fallback.push),
    sms: normalizeBoolean(value.sms, fallback.sms),
  };
}

function normalizeScope(value: unknown, defaultOn: boolean): NotificationPreferencesState {
  if (!isRecord(value)) return { preferences: {}, unsubscribed: false };

  const preferences: Record<string, NotificationChannels> = {};
  if (isRecord(value.preferences)) {
    for (const [id, channels] of Object.entries(value.preferences)) {
      preferences[id] = normalizeChannels(channels, defaultOn);
    }
  }

  return {
    preferences,
    unsubscribed: normalizeBoolean(value.unsubscribed, false),
  };
}

function normalizeNotifications(value: unknown) {
  const record = isRecord(value) ? value : {};
  return {
    offers: normalizeScope(record.offers, false),
    account: normalizeScope(record.account, true),
  };
}

async function findUserIdByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const user = (await getUsers()).find((item) => item.email.trim().toLowerCase() === normalizedEmail);
  return user?.id ?? null;
}

async function readNotificationSettings(userId: string) {
  if (env.PERSISTENCE_DRIVER === "prisma") {
    const record = await prisma.accountSettings.findUnique({
      where: { userId },
      select: { notificationPreferences: true },
    });
    return normalizeNotifications(record?.notificationPreferences);
  }

  const records = await readJsonStore<StoredAccountSettings>("account-settings.json");
  const record = records.find((item) => item.userId === userId);
  return normalizeNotifications(record?.notifications);
}

export async function isNotificationEmailAllowed(input: NotificationConsentInput) {
  if (input.kind === "essential") return true;

  const userId = await findUserIdByEmail(input.to);
  if (!userId) return input.kind === "account";

  const scope = input.scope ?? (input.kind === "marketing" ? "offers" : "account");
  const settings = await readNotificationSettings(userId);
  const scopedSettings = settings[scope];
  if (scopedSettings.unsubscribed) return false;

  const defaultOn = scope === "account";
  const channels = input.preferenceId
    ? (scopedSettings.preferences[input.preferenceId] ?? normalizeChannels(undefined, defaultOn))
    : normalizeChannels(undefined, defaultOn);

  return channels.email;
}
