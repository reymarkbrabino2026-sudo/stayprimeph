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
import { getCurrentUser } from "@/lib/auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please sign in again before saving account settings.");
  return user;
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "We could not save this setting. Please try again.";
}

async function withAccountAction<T>(callback: () => Promise<T>): Promise<AccountActionResult<T>> {
  try {
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

export async function savePersonalInfoAction(profile: PersonalInfoState) {
  return withAccountAction(async () => {
    const user = await requireUser();
    const next = await savePersonalInfo(user, profile);
    revalidateAccountPaths();
    return next;
  });
}

export async function saveNotificationSettingsAction(scope: NotificationScope, state: NotificationPreferencesState) {
  return withAccountAction(async () => {
    const user = await requireUser();
    const next = await saveNotificationSettings(user, scope, state);
    revalidatePath("/account-settings/notifications");
    revalidatePath("/account-settings/notifications/account");
    return next;
  });
}

export async function savePrivacySettingsAction(privacy: PrivacySettingsState) {
  return withAccountAction(async () => {
    const user = await requireUser();
    const next = await savePrivacySettings(user, privacy);
    revalidatePath("/account-settings/privacy");
    return next;
  });
}

export async function saveBookingPermissionsAction(bookingPermissions: BookingPermissionState) {
  return withAccountAction(async () => {
    const user = await requireUser();
    const next = await saveBookingPermissions(user, bookingPermissions);
    revalidatePath("/account-settings/booking-permissions");
    return next;
  });
}

export async function saveWorkTravelProfileAction(workTravel: WorkTravelProfile) {
  return withAccountAction(async () => {
    const user = await requireUser();
    const next = await saveWorkTravelProfile(user, workTravel);
    revalidatePath("/account-settings/travel-for-work");
    return next;
  });
}

export async function saveProfessionalHostingToolsAction(professionalHostingTools: ProfessionalHostingToolState) {
  return withAccountAction(async () => {
    const user = await requireUser();
    const next = await saveProfessionalHostingTools(user, professionalHostingTools);
    revalidatePath("/account-settings/professional-hosting-tools");
    return next;
  });
}

export async function saveFinancialSettingsAction(financial: FinancialSettingsState) {
  return withAccountAction(async () => {
    const user = await requireUser();
    const next = await saveFinancialSettings(user, financial);
    revalidatePath("/account-settings/payments");
    revalidatePath("/account-settings/payments/payouts");
    revalidatePath("/account-settings/payments/service-fee");
    revalidatePath("/account-settings/payments/donations");
    revalidatePath("/account-settings/taxes");
    return next;
  });
}
