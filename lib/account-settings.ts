import "server-only";

import { Prisma } from "@prisma/client";

import {
  defaultBookingPermissions,
  defaultLocalizationPreferences,
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
  type LocalizationPreferencesState,
  type NotificationPreferencesState,
  type NotificationScope,
  type PersonalInfoState,
  type PrivacySettingsState,
  type ProfessionalHostingToolState,
  type WorkTravelProfile,
} from "@/lib/account-settings-types";
import { verifyPassword } from "@/lib/auth";
import { issueAuthToken } from "@/lib/auth-tokens";
import { prisma } from "@/lib/db";
import { sendEmailChangeVerificationEmail } from "@/lib/email";
import { canonicalTokenValue, fieldNeedsEncryption, fieldToken, protectedTextForStorage, publicProtectedText } from "@/lib/field-protection";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { usesPrismaPersistence } from "@/lib/repositories";
import {
  payoutIdentifierNeedsProtection,
  protectPayoutIdentifierForStorage,
  protectTaxIdentifierForStorage,
  publicPayoutIdentifier,
  publicTaxIdentifier,
  taxIdentifierNeedsProtection,
} from "@/lib/tax-id-protection";
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
  localization?: unknown;
  financial?: unknown;
};

type DatabaseAccountSettings = {
  personalInfo: Prisma.JsonValue;
  notificationPreferences: Prisma.JsonValue;
  privacy: Prisma.JsonValue;
  bookingPermissions: Prisma.JsonValue;
  workTravel: Prisma.JsonValue;
  professionalHostingTools: Prisma.JsonValue;
  localization?: Prisma.JsonValue;
  financial: Prisma.JsonValue;
};

type SavePersonalInfoOptions = {
  currentPassword?: string;
};

const textFields = ["legalName", "preferredName", "email", "phone", "identity", "residentialAddress", "mailingAddress", "emergencyContact"] as const;
const bookingPermissionFields = ["profilePhoto", "verifiedPhone", "instantBooking", "newGuests"] as const;
const professionalToolFields = ["professionalTools", "ruleSets", "bulkEditing"] as const;
const workTravelTextFields = ["email", "companyName", "department", "employeeId"] as const;
const localizationFields = ["language", "currency", "region", "measurementUnits", "timeZone"] as const;
const donationApplyToValues = ["Bookings", "Payouts", "Both"] as const;
const payoutTypes = ["Bank account", "Digital wallet", "PayPal", "GCash", "Maya"] as const;
const providedMarker = "Provided";
const minimizedIdentityStatuses = new Set(["Verification started", "Verified", "Declined", "Expired"]);
const personalInfoStorageFields = ["preferredName", "identity", "residentialAddress", "mailingAddress", "emergencyContact"] as const;
const minimizedPersonalInfoFields = ["identity", "residentialAddress", "mailingAddress", "emergencyContact"] as const;
const personalInfoProtectionSuffixes = ["Token", "ProtectedAt"] as const;

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

function providedState(value: unknown) {
  return normalizeText(value).trim() ? providedMarker : "";
}

function protectedProvidedState(value: unknown, existingRecord: unknown, field: string, purpose: string, display: string) {
  const normalized = normalizeText(value).trim();
  const existing = isRecord(existingRecord) ? existingRecord : {};
  const existingToken = normalizeText(existing[`${field}Token`]);
  const existingProtectedAt = normalizeText(existing[`${field}ProtectedAt`]);

  if (!normalized) return { [field]: "" };
  if ((normalized === display || normalized === providedMarker || minimizedIdentityStatuses.has(normalized)) && existingToken) {
    return {
      [field]: normalized,
      [`${field}Token`]: existingToken,
      [`${field}ProtectedAt`]: existingProtectedAt || new Date().toISOString(),
    };
  }

  return {
    [field]: display,
    [`${field}Token`]: fieldToken(canonicalTokenValue(normalized), purpose),
    [`${field}ProtectedAt`]: new Date().toISOString(),
  };
}

function protectedText(value: unknown, purpose: string) {
  return protectedTextForStorage(normalizeText(value), purpose);
}

function publicText(value: unknown, purpose: string) {
  return publicProtectedText(value, purpose);
}

function normalizeIdentityStatus(value: unknown) {
  const status = normalizeText(value).trim();
  if (!status) return "";
  return minimizedIdentityStatuses.has(status) ? status : providedMarker;
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

function protectPersonalInfoForStorage(personalInfo: PersonalInfoState, existingPersonalInfo?: unknown) {
  return {
    preferredName: personalInfo.preferredName.trim(),
    ...protectedProvidedState(personalInfo.identity, existingPersonalInfo, "identity", "account-settings.personalInfo.identity", normalizeIdentityStatus(personalInfo.identity)),
    ...protectedProvidedState(personalInfo.residentialAddress, existingPersonalInfo, "residentialAddress", "account-settings.personalInfo.residentialAddress", providedMarker),
    ...protectedProvidedState(personalInfo.mailingAddress, existingPersonalInfo, "mailingAddress", "account-settings.personalInfo.mailingAddress", providedMarker),
    ...protectedProvidedState(personalInfo.emergencyContact, existingPersonalInfo, "emergencyContact", "account-settings.personalInfo.emergencyContact", providedMarker),
  };
}

function protectStoredPersonalInfoForStorage(personalInfo: unknown) {
  const value = isRecord(personalInfo) ? personalInfo : {};
  return protectPersonalInfoForStorage({
    legalName: "",
    preferredName: normalizeText(value.preferredName),
    email: "",
    phone: "",
    identity: normalizeText(value.identity),
    residentialAddress: normalizeText(value.residentialAddress),
    mailingAddress: normalizeText(value.mailingAddress),
    emergencyContact: normalizeText(value.emergencyContact),
  }, personalInfo);
}

function isAllowedPersonalInfoStorageField(field: string) {
  if (personalInfoStorageFields.includes(field as typeof personalInfoStorageFields[number])) return true;
  return minimizedPersonalInfoFields.some((sensitiveField) => personalInfoProtectionSuffixes.some((suffix) => field === `${sensitiveField}${suffix}`));
}

function personalInfoNeedsMinimization(personalInfo: unknown) {
  if (!isRecord(personalInfo)) return false;
  const duplicatesProfileFields = ["legalName", "email", "phone"].some((field) => typeof personalInfo[field] === "string" && personalInfo[field].trim());
  const hasUnexpectedField = Object.keys(personalInfo).some((field) => !isAllowedPersonalInfoStorageField(field));
  const hasRawSensitiveText = minimizedPersonalInfoFields.some((field) => {
    const value = normalizeText(personalInfo[field]).trim();
    return value && value !== providedMarker && !minimizedIdentityStatuses.has(value);
  });
  return duplicatesProfileFields || hasUnexpectedField || hasRawSensitiveText;
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
    blockedPeople: Array.isArray(value.blockedPeople)
      ? value.blockedPeople.map((item) => publicText(item, "account-settings.privacy.blockedPeople")).filter(Boolean)
      : [],
    dataRequestedAt: typeof value.dataRequestedAt === "string" ? value.dataRequestedAt : null,
    deletionRequestedAt: typeof value.deletionRequestedAt === "string" ? value.deletionRequestedAt : null,
    deletionVerifiedAt: typeof value.deletionVerifiedAt === "string" ? value.deletionVerifiedAt : null,
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
  for (const field of workTravelTextFields) next[field] = publicText(value[field], `account-settings.workTravel.${field}`);
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

function normalizeLocalizationPreferences(value: unknown): LocalizationPreferencesState {
  const next = { ...defaultLocalizationPreferences };
  if (!isRecord(value)) return next;
  for (const field of localizationFields) {
    const normalized = normalizeText(value[field]).trim();
    if (normalized) next[field] = normalized;
  }
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
        cardholder: publicText(method.cardholder, "account-settings.financial.paymentMethods.cardholder"),
        brand: normalizeText(method.brand) || "Card",
        last4: normalizeText(method.last4).replace(/\D/g, "").slice(-4),
        expiry: normalizeText(method.expiry),
        billingZip: "",
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
        accountName: publicText(method.accountName, "account-settings.financial.payoutMethods.accountName"),
        bankName: normalizeText(method.bankName),
        accountNumber: publicPayoutIdentifier(method, "accountNumber") || publicPayoutIdentifier(method, "accountLast4"),
        accountLast4: publicPayoutIdentifier(method, "accountLast4") || undefined,
        currency: normalizeText(method.currency).toUpperCase() || "PHP",
      })).filter((method) => method.id && method.accountNumber)
      : defaults.payoutMethods,
    taxpayer: isRecord(value.taxpayer) ? {
      legalName: publicText(value.taxpayer.legalName, "account-settings.financial.taxpayer.legalName"),
      country: normalizeText(value.taxpayer.country) || "Philippines",
      taxId: publicTaxIdentifier(value.taxpayer, "taxId"),
      address: providedState(value.taxpayer.address) || (value.taxpayer.addressProvided === true ? providedMarker : ""),
    } : null,
    vat: isRecord(value.vat) ? {
      businessName: publicText(value.vat.businessName, "account-settings.financial.vat.businessName"),
      country: normalizeText(value.vat.country) || "Philippines",
      vatId: publicTaxIdentifier(value.vat, "vatId"),
    } : null,
    donationPreference: normalizeDonationPreference(value.donationPreference),
  };
}

function protectedIdentifierFields(input: string, existingRecord: unknown, field: string) {
  const protectedId = protectTaxIdentifierForStorage(input, existingRecord, field);
  if (!protectedId) {
    return { [field]: "" };
  }

  return {
    [field]: protectedId.display,
    [`${field}Token`]: protectedId.token,
    [`${field}Last4`]: protectedId.last4,
    [`${field}ProtectedAt`]: protectedId.protectedAt,
  };
}

function protectedPayoutIdentifierFields(input: string, existingRecord: unknown, field: string) {
  const protectedId = protectPayoutIdentifierForStorage(input, existingRecord, field);
  if (!protectedId) {
    return { [field]: "" };
  }

  return {
    [field]: protectedId.display,
    [`${field}Token`]: protectedId.token,
    [`${field}Last4`]: protectedId.last4,
    [`${field}ProtectedAt`]: protectedId.protectedAt,
  };
}

function protectFinancialSettingsForStorage(financial: FinancialSettingsState, existingFinancial: unknown) {
  const existing = isRecord(existingFinancial) ? existingFinancial : {};
  const existingPayoutMethods = Array.isArray(existing.payoutMethods) ? existing.payoutMethods : [];
  const paymentMethods = financial.paymentMethods.map((method) => ({
    ...method,
    cardholder: protectedText(method.cardholder, "account-settings.financial.paymentMethods.cardholder"),
    billingZip: "",
    billingZipProvided: Boolean(method.billingZip.trim()),
  }));
  const payoutMethods = financial.payoutMethods.map((method) => {
    const existingMethod = existingPayoutMethods.find((item) => isRecord(item) && item.id === method.id);
    const methodForStorage = { ...method };
    delete methodForStorage.accountLast4;
    return {
      ...methodForStorage,
      accountName: protectedText(method.accountName, "account-settings.financial.payoutMethods.accountName"),
      ...protectedPayoutIdentifierFields(method.accountNumber, existingMethod, "accountNumber"),
    };
  });
  const taxpayer = financial.taxpayer
    ? {
      ...financial.taxpayer,
      legalName: protectedText(financial.taxpayer.legalName, "account-settings.financial.taxpayer.legalName"),
      address: providedState(financial.taxpayer.address),
      addressProvided: Boolean(financial.taxpayer.address.trim()),
      ...protectedIdentifierFields(financial.taxpayer.taxId, existing.taxpayer, "taxId"),
    }
    : null;
  const vat = financial.vat
    ? {
      ...financial.vat,
      businessName: protectedText(financial.vat.businessName, "account-settings.financial.vat.businessName"),
      ...protectedIdentifierFields(financial.vat.vatId, existing.vat, "vatId"),
    }
    : null;

  return {
    ...financial,
    paymentMethods,
    payoutMethods,
    taxpayer,
    vat,
  };
}

function protectWorkTravelForStorage(workTravel: WorkTravelProfile) {
  return {
    ...workTravel,
    email: protectedText(workTravel.email, "account-settings.workTravel.email"),
    companyName: protectedText(workTravel.companyName, "account-settings.workTravel.companyName"),
    department: protectedText(workTravel.department, "account-settings.workTravel.department"),
    employeeId: protectedText(workTravel.employeeId, "account-settings.workTravel.employeeId"),
  };
}

function protectPrivacyForStorage(privacy: PrivacySettingsState) {
  return {
    ...privacy,
    blockedPeople: privacy.blockedPeople.map((value) => protectedText(value, "account-settings.privacy.blockedPeople")),
  };
}

function financialSettingsNeedProtection(financial: unknown) {
  if (!isRecord(financial)) return false;
  const paymentAddressNeedsMinimization = Array.isArray(financial.paymentMethods)
    && financial.paymentMethods.some((method) => isRecord(method) && normalizeText(method.billingZip).trim());
  const paymentMethodNeedsEncryption = Array.isArray(financial.paymentMethods)
    && financial.paymentMethods.some((method) => isRecord(method) && fieldNeedsEncryption(method.cardholder));
  const taxpayerAddressNeedsMinimization = isRecord(financial.taxpayer)
    && normalizeText(financial.taxpayer.address).trim()
    && financial.taxpayer.address !== providedMarker;
  const payoutNeedsProtection = Array.isArray(financial.payoutMethods)
    && financial.payoutMethods.some((method) => payoutIdentifierNeedsProtection(method, "accountNumber") || payoutIdentifierNeedsProtection(method, "accountLast4"));
  const payoutTextNeedsEncryption = Array.isArray(financial.payoutMethods)
    && financial.payoutMethods.some((method) => isRecord(method) && fieldNeedsEncryption(method.accountName));
  return paymentAddressNeedsMinimization
    || paymentMethodNeedsEncryption
    || taxpayerAddressNeedsMinimization
    || fieldNeedsEncryption(isRecord(financial.taxpayer) ? financial.taxpayer.legalName : undefined)
    || fieldNeedsEncryption(isRecord(financial.vat) ? financial.vat.businessName : undefined)
    || payoutTextNeedsEncryption
    || payoutNeedsProtection
    || taxIdentifierNeedsProtection(financial.taxpayer, "taxId")
    || taxIdentifierNeedsProtection(financial.vat, "vatId");
}

function workTravelNeedsProtection(workTravel: unknown) {
  if (!isRecord(workTravel)) return false;
  return workTravelTextFields.some((field) => fieldNeedsEncryption(workTravel[field]));
}

function privacyNeedsProtection(privacy: unknown) {
  if (!isRecord(privacy) || !Array.isArray(privacy.blockedPeople)) return false;
  return privacy.blockedPeople.some(fieldNeedsEncryption);
}

function normalizeAccountSettings(user: User, stored?: Partial<StoredAccountSettings>): AccountSettingsData {
  return {
    personalInfo: normalizePersonalInfo(user, stored?.personalInfo),
    notifications: normalizeNotificationPreferences(stored?.notifications),
    privacy: normalizePrivacySettings(stored?.privacy),
    bookingPermissions: normalizeBookingPermissions(stored?.bookingPermissions),
    workTravel: normalizeWorkTravelProfile(stored?.workTravel),
    professionalHostingTools: normalizeProfessionalHostingTools(stored?.professionalHostingTools),
    localization: normalizeLocalizationPreferences(stored?.localization),
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
    localization: record.localization,
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
        localization: true,
        financial: true,
      },
    });
    const minimizePersonalInfo = record ? personalInfoNeedsMinimization(record.personalInfo) : false;
    const protectFinancial = record ? financialSettingsNeedProtection(record.financial) : false;
    const protectWorkTravel = record ? workTravelNeedsProtection(record.workTravel) : false;
    const protectPrivacy = record ? privacyNeedsProtection(record.privacy) : false;
    if (record && (minimizePersonalInfo || protectFinancial || protectWorkTravel || protectPrivacy)) {
      const personalInfo = minimizePersonalInfo ? protectStoredPersonalInfoForStorage(record.personalInfo) : record.personalInfo;
      const financial = protectFinancial ? protectFinancialSettingsForStorage(normalizeFinancialSettings(record.financial), record.financial) : record.financial;
      const workTravel = protectWorkTravel ? protectWorkTravelForStorage(normalizeWorkTravelProfile(record.workTravel)) : record.workTravel;
      const privacy = protectPrivacy ? protectPrivacyForStorage(normalizePrivacySettings(record.privacy)) : record.privacy;
      await prisma.accountSettings.update({
        where: { userId },
        data: {
          personalInfo: personalInfo as Prisma.InputJsonValue,
          privacy: privacy as Prisma.InputJsonValue,
          workTravel: workTravel as Prisma.InputJsonValue,
          financial: financial as Prisma.InputJsonValue,
        },
      });
      return fromDatabase({
        ...record,
        personalInfo: personalInfo as Prisma.JsonValue,
        privacy: privacy as Prisma.JsonValue,
        workTravel: workTravel as Prisma.JsonValue,
        financial: financial as Prisma.JsonValue,
      });
    }
    return fromDatabase(record);
  }

  const records = await readJsonStore<StoredAccountSettings>(storeFileName);
  const record = records.find((item) => item.userId === userId);
  const minimizePersonalInfo = record ? personalInfoNeedsMinimization(record.personalInfo) : false;
  const protectFinancial = record ? financialSettingsNeedProtection(record.financial) : false;
  const protectWorkTravel = record ? workTravelNeedsProtection(record.workTravel) : false;
  const protectPrivacy = record ? privacyNeedsProtection(record.privacy) : false;
  if (record && (minimizePersonalInfo || protectFinancial || protectWorkTravel || protectPrivacy)) {
    const personalInfo = minimizePersonalInfo ? protectStoredPersonalInfoForStorage(record.personalInfo) : record.personalInfo;
    const financial = protectFinancial ? protectFinancialSettingsForStorage(normalizeFinancialSettings(record.financial), record.financial) : record.financial;
    const workTravel = protectWorkTravel ? protectWorkTravelForStorage(normalizeWorkTravelProfile(record.workTravel)) : record.workTravel;
    const privacy = protectPrivacy ? protectPrivacyForStorage(normalizePrivacySettings(record.privacy)) : record.privacy;
    const nextRecord = { ...record, personalInfo, privacy, workTravel, financial };
    await writeJsonStore(storeFileName, records.map((item) => (item.userId === userId ? nextRecord : item)));
    return nextRecord;
  }
  return record;
}

async function writeStoredAccountSettings(userId: string, next: AccountSettingsData) {
  if (usesPrismaPersistence()) {
    const existing = await prisma.accountSettings.findUnique({
      where: { userId },
      select: { personalInfo: true, financial: true },
    });
    const personalInfo = protectPersonalInfoForStorage(next.personalInfo, existing?.personalInfo);
    const financial = protectFinancialSettingsForStorage(next.financial, existing?.financial);
    const data = {
      personalInfo: personalInfo as Prisma.InputJsonValue,
      notificationPreferences: next.notifications as Prisma.InputJsonValue,
      privacy: protectPrivacyForStorage(next.privacy) as Prisma.InputJsonValue,
      bookingPermissions: next.bookingPermissions as Prisma.InputJsonValue,
      workTravel: protectWorkTravelForStorage(next.workTravel) as Prisma.InputJsonValue,
      professionalHostingTools: next.professionalHostingTools as Prisma.InputJsonValue,
      localization: next.localization as Prisma.InputJsonValue,
      financial: financial as Prisma.InputJsonValue,
    };
    await prisma.accountSettings.upsert({
      where: { userId },
      create: { id: `account-settings-${userId}`, userId, ...data },
      update: data,
    });
    return;
  }

  const records = await readJsonStore<StoredAccountSettings>(storeFileName);
  const existingRecord = records.find((record) => record.userId === userId);
  const personalInfo = protectPersonalInfoForStorage(next.personalInfo, existingRecord?.personalInfo);
  const financial = protectFinancialSettingsForStorage(next.financial, existingRecord?.financial);
  const replacement: StoredAccountSettings = {
    userId,
    personalInfo,
    notifications: next.notifications,
    privacy: protectPrivacyForStorage(next.privacy),
    bookingPermissions: next.bookingPermissions,
    workTravel: protectWorkTravelForStorage(next.workTravel),
    professionalHostingTools: next.professionalHostingTools,
    localization: next.localization,
    financial,
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

async function assertEmailAvailableForUser(userId: string, email: string) {
  if (usesPrismaPersistence()) {
    const existingUser = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
      select: { id: true },
    });
    if (existingUser) throw new Error("That email is already used by another account.");
    return;
  }

  const users = await readStoredUsers();
  if (users.some((item) => item.id !== userId && item.email.toLowerCase() === email)) {
    throw new Error("That email is already used by another account.");
  }
}

export async function getAccountSettings(user: User) {
  const stored = await readStoredAccountSettings(user.id);
  return normalizeAccountSettings(user, stored);
}

export async function savePersonalInfo(user: User, profile: PersonalInfoState, options: SavePersonalInfoOptions = {}) {
  const current = await getAccountSettings(user);
  const nextProfile = normalizePersonalInfo(user, profile);
  const requestedEmail = nextProfile.email.trim().toLowerCase();
  const nextEmail = requestedEmail || user.email.trim().toLowerCase();
  const currentEmail = user.email.trim().toLowerCase();
  let profileToPersist = nextProfile;
  let pendingEmailChange: { oldEmail: string; newEmail: string } | null = null;

  if (nextEmail !== currentEmail) {
    if (!options.currentPassword) {
      throw new Error("Enter your current password to change your email address.");
    }

    if (!user.passwordHash) {
      throw new Error("Set a password before changing your email address.");
    }

    if (!verifyPassword(options.currentPassword, user.passwordHash)) {
      throw new Error("Current password is incorrect.");
    }

    if (!isValidEmail(nextEmail)) throw new Error("Use a valid email address.");
    await assertEmailAvailableForUser(user.id, nextEmail);

    profileToPersist = { ...nextProfile, email: user.email };
    pendingEmailChange = { oldEmail: currentEmail, newEmail: nextEmail };
  }

  const next = { ...current, personalInfo: profileToPersist };
  await updateUserProfileFields(user, profileToPersist);
  await writeStoredAccountSettings(user.id, next);

  if (pendingEmailChange) {
    const token = await issueAuthToken(user.id, "email_change", pendingEmailChange);
    await sendEmailChangeVerificationEmail({ to: pendingEmailChange.newEmail, name: user.name, token, currentEmail: user.email });
  }

  return profileToPersist;
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

export async function saveLocalizationPreferences(user: User, localization: LocalizationPreferencesState) {
  const current = await getAccountSettings(user);
  const nextLocalization = normalizeLocalizationPreferences(localization);
  const next = { ...current, localization: nextLocalization };
  await writeStoredAccountSettings(user.id, next);
  return nextLocalization;
}

export async function saveFinancialSettings(user: User, financial: FinancialSettingsState) {
  const current = await getAccountSettings(user);
  const nextFinancial = normalizeFinancialSettings(financial);
  const next = { ...current, financial: nextFinancial };
  await writeStoredAccountSettings(user.id, next);
  return nextFinancial;
}
