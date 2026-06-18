"use server";

import { revalidatePath } from "next/cache";

import {
  saveBookingPermissions,
  saveNotificationSettings,
  savePersonalInfo,
  savePrivacySettings,
  saveProfessionalHostingTools,
  saveFinancialSettings,
  saveWorkTravelProfile,
} from "@/lib/account-settings";
import type {
  AccountActionResult,
  BookingPermissionState,
  FinancialSettingsState,
  NotificationPreferencesState,
  NotificationScope,
  PersonalInfoState,
  PrivacySettingsState,
  ProfessionalHostingToolState,
  WorkTravelProfile,
} from "@/lib/account-settings-types";
import { requireUser, requireVerifiedEmail, verifyPassword } from "@/lib/auth";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { requestUserDataExport } from "@/lib/user-data-export";

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "We could not save this setting. Please try again.";
}

async function withAccountAction<T>(callback: () => Promise<T>): Promise<AccountActionResult<T>> {
  try {
    await assertTrustedRequestOrigin();
    return { ok: true, data: await callback() };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

function revalidateAccountPaths() {
  revalidatePath("/account-settings");
  revalidatePath("/guest/profile");
  revalidatePath("/host/profile");
}

export async function savePersonalInfoAction(profile: PersonalInfoState, currentPassword?: string) {
  return withAccountAction(async () => {
    const user = await requireUser({ message: "Please sign in again before saving account settings." });
    const next = await savePersonalInfo(user, profile, { currentPassword });
    revalidateAccountPaths();
    return next;
  });
}

export async function saveNotificationSettingsAction(scope: NotificationScope, state: NotificationPreferencesState) {
  return withAccountAction(async () => {
    const user = await requireUser({ message: "Please sign in again before saving account settings." });
    const next = await saveNotificationSettings(user, scope, state);
    revalidatePath("/account-settings/notifications");
    revalidatePath("/account-settings/notifications/account");
    return next;
  });
}

export async function savePrivacySettingsAction(privacy: PrivacySettingsState) {
  return withAccountAction(async () => {
    const user = await requireUser({ message: "Please sign in again before saving account settings." });
    const next = await savePrivacySettings(user, privacy);
    revalidatePath("/account-settings/privacy");
    return next;
  });
}

export async function requestUserDataExportAction() {
  return withAccountAction(async () => {
    const user = await requireUser({ message: "Please sign in again before exporting account data." });
    requireVerifiedEmail(user);
    const result = await requestUserDataExport(user);
    revalidatePath("/account-settings/privacy");
    return result;
  });
}

export async function saveBookingPermissionsAction(bookingPermissions: BookingPermissionState) {
  return withAccountAction(async () => {
    const user = await requireUser({ message: "Please sign in again before saving account settings." });
    const next = await saveBookingPermissions(user, bookingPermissions);
    revalidatePath("/account-settings/booking-permissions");
    return next;
  });
}

export async function saveWorkTravelProfileAction(workTravel: WorkTravelProfile) {
  return withAccountAction(async () => {
    const user = await requireUser({ message: "Please sign in again before saving account settings." });
    const next = await saveWorkTravelProfile(user, workTravel);
    revalidatePath("/account-settings/travel-for-work");
    return next;
  });
}

export async function saveProfessionalHostingToolsAction(professionalHostingTools: ProfessionalHostingToolState) {
  return withAccountAction(async () => {
    const user = await requireUser({ message: "Please sign in again before saving account settings." });
    const next = await saveProfessionalHostingTools(user, professionalHostingTools);
    revalidatePath("/account-settings/professional-hosting-tools");
    return next;
  });
}

export async function saveFinancialSettingsAction(financial: FinancialSettingsState, currentPassword?: string) {
  return withAccountAction(async () => {
    const user = await requireUser({ message: "Please sign in again before saving account settings." });
    if (user.role === "host") {
      requireVerifiedEmail(user);
      if (!user.passwordHash) throw new Error("Set a password before changing payment or payout settings.");
      if (!currentPassword) throw new Error("Enter your current password before changing payment or payout settings.");
      if (!verifyPassword(currentPassword, user.passwordHash)) throw new Error("Current password is incorrect.");
    }
    const next = await saveFinancialSettings(user, financial);
    revalidatePath("/account-settings/payments");
    revalidatePath("/account-settings/payments/payouts");
    revalidatePath("/account-settings/payments/service-fee");
    revalidatePath("/account-settings/payments/donations");
    revalidatePath("/account-settings/taxes");
    return next;
  });
}
