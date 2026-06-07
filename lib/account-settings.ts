import "server-only";

import { Prisma } from "@prisma/client";

import {
  defaultBookingPermissions,
  defaultNotificationPreferences,
  defaultDonationPreference,
  defaultFinancialSettings,
  defaultPersonalInfo,
  defaultPrivacySettings,
  defaultProfessionalHostingTools,
  defaultWorkTravelProfile,
  type AccountSettingsData,
  type BookingPermissionState,
  type DonationPreference,
  type FinancialSettingsState,
  type NotificationPreferencesState,
  type NotificationScope,
  type PersonalInfoState,
  type PrivacySettingsState,
  type ProfessionalHostingToolState,
  type WorkTravelProfile,
} from "@/lib/account-settings-types";
import { prisma } from "@/lib/db";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { usesPrismaPersistence } from "@/lib/repositories";
import type { User } from "@/lib/types";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";

const storeFileName = "account-settings.json";

type StoredAccountSettings = {
  userId: string;
  personalInfo?: unknown;
  notifications?: unknown;
  privacy?: unknown;
  bookingPermissions?: unknown;
  workTravel?: unknown;
  professionalHostingTools?: unknown;
  financial?: unknown;
};

type DatabaseAccountSettings = {
  personalInfo: Prisma.JsonValue;
  notificationPreferences: Prisma.JsonValue;
  privacy: Prisma.JsonValue;
  bookingPermissions: Prisma.JsonValue;
  workTravel: Prisma.JsonValue;
  professionalHostingTools: Prisma.JsonValue;
  financial: Prisma.JsonValue;
};

const textFields = ["legalName", "preferredName", "email", "phone", "identity", "residentialAddress", "mailingAddress", "emergencyContact"] as const;
const bookingPermissionFields = ["profilePhoto", "verifiedPhone", "instantBooking", "newGuests"] as const;
const professionalToolFields = ["professionalTools", "ruleSets", "bulkEditing"] as const;
const workTravelTextFields = ["email", "companyName", "department", "employeeId"] as const;
const serviceFeeModes = ["single", "split"] as const;
const donationApplyToValues = ["Bookings", "Payouts", "Both"] as const;
const payoutTypes = ["Bank account", "PayPal", "GCash"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePersonalInfo(user: User, value: unknown): PersonalInfoState {
  const defaults = defaultPersonalInfo(user);
  if (!isRecord(value)) return defaults;

  const next = { ...defaults };
  for (const field of textFields) {
    if (typeof value[field] === "string") next[field] = value[field];
  }
  return next;
}

function normalizeNotificationChannels(value: unknown, fallback: { email: boolean; push: boolean; sms: boolean }) {
  if (!isRecord(value)) return fallback;
  return {
    email: normalizeBoolean(value.email, fallback.email),
    push: normalizeBoolean(value.push, fallback.push),
    sms: normalizeBoolean(value.sms, fallback.sms),
  };
}

function normalizeNotificationPreferences(value: unknown): Record<NotificationScope, NotificationPreferencesState> {
  const empty = {
    offers: defaultNotificationPreferences(),
    account: defaultNotificationPreferences(),
  };
  if (!isRecord(value)) return empty;

  const next = { ...empty };
  for (const scope of ["offers", "account"] as const) {
    const storedScope = value[scope];
    if (!isRecord(storedScope)) continue;

    const preferences: Record<string, { email: boolean; push: boolean; sms: boolean }> = {};
    if (isRecord(storedScope.preferences)) {
      for (const [id, channels] of Object.entries(storedScope.preferences)) {
        preferences[id] = normalizeNotificationChannels(channels, { email: false, push: false, sms: false });
      }
    }
    next[scope] = {
      preferences,
      unsubscribed: normalizeBoolean(storedScope.unsubscribed, false),
    };
  }

  return next;
}

function normalizePrivacySettings(value: unknown): PrivacySettingsState {
  const defaults = defaultPrivacySettings();
  if (!isRecord(value)) return defaults;

  const settings = { ...defaults.settings };
  if (isRecord(value.settings)) {
    for (const key of Object.keys(settings) as Array<keyof typeof settings>) {
      settings[key] = normalizeBoolean(value.settings[key], settings[key]);
    }
  }

  return {
    settings,
    blockedPeople: Array.isArray(value.blockedPeople) ? value.blockedPeople.filter((item): item is string => typeof item === "string") : [],
    dataRequestedAt: typeof value.dataRequestedAt === "string" ? value.dataRequestedAt : null,
    deletionRequestedAt: typeof value.deletionRequestedAt === "string" ? value.deletionRequestedAt : null,
  };
}

function normalizeBookingPermissions(value: unknown): BookingPermissionState {
  const next = { ...defaultBookingPermissions };
  if (!isRecord(value)) return next;
  for (const field of bookingPermissionFields) next[field] = normalizeBoolean(value[field], next[field]);
  return next;
}

function normalizeWorkTravelProfile(value: unknown): WorkTravelProfile {
  const next = { ...defaultWorkTravelProfile };
  if (!isRecord(value)) return next;
  for (const field of workTravelTextFields) next[field] = normalizeText(value[field]);
  next.includeBusinessReceipts = normalizeBoolean(value.includeBusinessReceipts, next.includeBusinessReceipts);
  next.verified = normalizeBoolean(value.verified, next.verified);
  return next;
}

function normalizeProfessionalHostingTools(value: unknown): ProfessionalHostingToolState {
  const next = { ...defaultProfessionalHostingTools };
  if (!isRecord(value)) return next;
  for (const field of professionalToolFields) next[field] = normalizeBoolean(value[field], next[field]);
  return next;
}

function normalizeDonationPreference(value: unknown): DonationPreference {
  if (!isRecord(value)) return defaultDonationPreference;
  const applyTo = typeof value.applyTo === "string" && donationApplyToValues.includes(value.applyTo as DonationPreference["applyTo"]) ? value.applyTo as DonationPreference["applyTo"] : defaultDonationPreference.applyTo;
  return {
    recurring: normalizeBoolean(value.recurring, defaultDonationPreference.recurring),
    amount: normalizeText(value.amount) || defaultDonationPreference.amount,
    nonprofit: normalizeText(value.nonprofit) || defaultDonationPreference.nonprofit,
    applyTo,
  };
}

function normalizeFinancialSettings(value: unknown): FinancialSettingsState {
  const defaults = defaultFinancialSettings;
  if (!isRecord(value)) return defaults;

  return {
    paymentMethods: Array.isArray(value.paymentMethods)
      ? value.paymentMethods.filter(isRecord).map((method) => ({
        id: normalizeText(method.id),
        cardholder: normalizeText(method.cardholder),
        brand: normalizeText(method.brand) || "Card",
        last4: normalizeText(method.last4).replace(/\D/g, "").slice(-4),
        expiry: normalizeText(method.expiry),
        billingZip: normalizeText(method.billingZip),
      })).filter((method) => method.id && method.last4)
      : defaults.paymentMethods,
    giftCredits: Array.isArray(value.giftCredits)
      ? value.giftCredits.filter(isRecord).map((credit) => ({
        code: normalizeText(credit.code).toUpperCase(),
        amount: Number.isFinite(Number(credit.amount)) ? Number(credit.amount) : 0,
      })).filter((credit) => credit.code)
      : defaults.giftCredits,
    coupons: Array.isArray(value.coupons)
      ? value.coupons.filter(isRecord).map((coupon) => ({
        code: normalizeText(coupon.code).toUpperCase(),
        discount: normalizeText(coupon.discount),
      })).filter((coupon) => coupon.code)
      : defaults.coupons,
    payoutMethods: Array.isArray(value.payoutMethods)
      ? value.payoutMethods.filter(isRecord).map((method) => ({
        id: normalizeText(method.id),
        type: typeof method.type === "string" && payoutTypes.includes(method.type as FinancialSettingsState["payoutMethods"][number]["type"]) ? method.type as FinancialSettingsState["payoutMethods"][number]["type"] : "Bank account",
        accountName: normalizeText(method.accountName),
        bankName: normalizeText(method.bankName),
        accountLast4: normalizeText(method.accountLast4).replace(/\D/g, "").slice(-4),
        currency: normalizeText(method.currency).toUpperCase() || "PHP",
      })).filter((method) => method.id && method.accountLast4)
      : defaults.payoutMethods,
    taxpayer: isRecord(value.taxpayer) ? {
      legalName: normalizeText(value.taxpayer.legalName),
      country: normalizeText(value.taxpayer.country) || "Philippines",
      taxId: normalizeText(value.taxpayer.taxId),
      address: normalizeText(value.taxpayer.address),
    } : null,
    vat: isRecord(value.vat) ? {
      businessName: normalizeText(value.vat.businessName),
      country: normalizeText(value.vat.country) || "Philippines",
      vatId: normalizeText(value.vat.vatId),
    } : null,
    donationPreference: normalizeDonationPreference(value.donationPreference),
    serviceFeeMode: typeof value.serviceFeeMode === "string" && serviceFeeModes.includes(value.serviceFeeMode as FinancialSettingsState["serviceFeeMode"]) ? value.serviceFeeMode as FinancialSettingsState["serviceFeeMode"] : defaults.serviceFeeMode,
  };
}

function normalizeAccountSettings(user: User, stored?: Partial<StoredAccountSettings>): AccountSettingsData {
  return {
    personalInfo: normalizePersonalInfo(user, stored?.personalInfo),
    notifications: normalizeNotificationPreferences(stored?.notifications),
    privacy: normalizePrivacySettings(stored?.privacy),
    bookingPermissions: normalizeBookingPermissions(stored?.bookingPermissions),
    workTravel: normalizeWorkTravelProfile(stored?.workTravel),
    professionalHostingTools: normalizeProfessionalHostingTools(stored?.professionalHostingTools),
    financial: normalizeFinancialSettings(stored?.financial),
  };
}

function fromDatabase(record: DatabaseAccountSettings | null): Partial<StoredAccountSettings> | undefined {
  if (!record) return undefined;
  return {
    personalInfo: record.personalInfo,
    notifications: record.notificationPreferences,
    privacy: record.privacy,
    bookingPermissions: record.bookingPermissions,
    workTravel: record.workTravel,
    professionalHostingTools: record.professionalHostingTools,
    financial: record.financial,
  };
}

async function readStoredAccountSettings(userId: string) {
  if (usesPrismaPersistence()) {
    const record = await prisma.accountSettings.findUnique({
      where: { userId },
      select: {
        personalInfo: true,
        notificationPreferences: true,
        privacy: true,
        bookingPermissions: true,
        workTravel: true,
        professionalHostingTools: true,
        financial: true,
      },
    });
    return fromDatabase(record);
  }

  const records = await readJsonStore<StoredAccountSettings>(storeFileName);
  return records.find((record) => record.userId === userId);
}

async function writeStoredAccountSettings(userId: string, next: AccountSettingsData) {
  if (usesPrismaPersistence()) {
    const data = {
      personalInfo: next.personalInfo as Prisma.InputJsonValue,
      notificationPreferences: next.notifications as Prisma.InputJsonValue,
      privacy: next.privacy as Prisma.InputJsonValue,
      bookingPermissions: next.bookingPermissions as Prisma.InputJsonValue,
      workTravel: next.workTravel as Prisma.InputJsonValue,
      professionalHostingTools: next.professionalHostingTools as Prisma.InputJsonValue,
      financial: next.financial as Prisma.InputJsonValue,
    };
    await prisma.accountSettings.upsert({
      where: { userId },
      create: { id: `account-settings-${userId}`, userId, ...data },
      update: data,
    });
    return;
  }

  const records = await readJsonStore<StoredAccountSettings>(storeFileName);
  const replacement: StoredAccountSettings = {
    userId,
    personalInfo: next.personalInfo,
    notifications: next.notifications,
    privacy: next.privacy,
    bookingPermissions: next.bookingPermissions,
    workTravel: next.workTravel,
    professionalHostingTools: next.professionalHostingTools,
    financial: next.financial,
  };
  const existing = records.some((record) => record.userId === userId);
  await writeJsonStore(storeFileName, existing ? records.map((record) => (record.userId === userId ? replacement : record)) : [replacement, ...records]);
}

async function updateUserProfileFields(user: User, profile: PersonalInfoState) {
  const email = profile.email.trim().toLowerCase();
  const nextEmail = email || user.email;
  const name = profile.legalName.trim() || user.name;
  const phone = profile.phone.trim();

  if (!isValidEmail(nextEmail)) throw new Error("Use a valid email address.");

  if (usesPrismaPersistence()) {
    const existingUser = await prisma.user.findFirst({
      where: { email: nextEmail, NOT: { id: user.id } },
      select: { id: true },
    });
    if (existingUser) throw new Error("That email is already used by another account.");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email: nextEmail,
        phone,
      },
    });
    return;
  }

  const users = await readStoredUsers();
  if (users.some((item) => item.id !== user.id && item.email.toLowerCase() === nextEmail)) {
    throw new Error("That email is already used by another account.");
  }
  await writeStoredUsers(users.map((item) => (item.id === user.id ? { ...item, name, email: nextEmail, phone } : item)));
}

export async function getAccountSettings(user: User) {
  const stored = await readStoredAccountSettings(user.id);
  return normalizeAccountSettings(user, stored);
}

export async function savePersonalInfo(user: User, profile: PersonalInfoState) {
  const current = await getAccountSettings(user);
  const nextProfile = normalizePersonalInfo(user, profile);
  const next = { ...current, personalInfo: nextProfile };
  await updateUserProfileFields(user, nextProfile);
  await writeStoredAccountSettings(user.id, next);
  return nextProfile;
}

export async function saveNotificationSettings(user: User, scope: NotificationScope, state: NotificationPreferencesState) {
  const current = await getAccountSettings(user);
  const next = {
    ...current,
    notifications: {
      ...current.notifications,
      [scope]: {
        preferences: isRecord(state.preferences) ? state.preferences : {},
        unsubscribed: Boolean(state.unsubscribed),
      },
    },
  };
  await writeStoredAccountSettings(user.id, next);
  return next.notifications[scope];
}

export async function savePrivacySettings(user: User, privacy: PrivacySettingsState) {
  const current = await getAccountSettings(user);
  const nextPrivacy = normalizePrivacySettings(privacy);
  const next = { ...current, privacy: nextPrivacy };
  await writeStoredAccountSettings(user.id, next);
  return nextPrivacy;
}

export async function saveBookingPermissions(user: User, bookingPermissions: BookingPermissionState) {
  const current = await getAccountSettings(user);
  const nextBookingPermissions = normalizeBookingPermissions(bookingPermissions);
  const next = { ...current, bookingPermissions: nextBookingPermissions };
  await writeStoredAccountSettings(user.id, next);
  return nextBookingPermissions;
}

export async function saveWorkTravelProfile(user: User, workTravel: WorkTravelProfile) {
  const current = await getAccountSettings(user);
  const nextWorkTravel = normalizeWorkTravelProfile(workTravel);
  const next = { ...current, workTravel: nextWorkTravel };
  await writeStoredAccountSettings(user.id, next);
  return nextWorkTravel;
}

export async function saveProfessionalHostingTools(user: User, professionalHostingTools: ProfessionalHostingToolState) {
  const current = await getAccountSettings(user);
  const nextProfessionalHostingTools = normalizeProfessionalHostingTools(professionalHostingTools);
  const next = { ...current, professionalHostingTools: nextProfessionalHostingTools };
  await writeStoredAccountSettings(user.id, next);
  return nextProfessionalHostingTools;
}

export async function saveFinancialSettings(user: User, financial: FinancialSettingsState) {
  const current = await getAccountSettings(user);
  const nextFinancial = normalizeFinancialSettings(financial);
  const next = { ...current, financial: nextFinancial };
  await writeStoredAccountSettings(user.id, next);
  return nextFinancial;
}
