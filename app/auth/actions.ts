"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearSession, createSession, hashPassword, roleHome, verifyPassword } from "@/lib/auth";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { consumeAuthToken, issueAuthToken, markUserEmailVerified, updateUserPassword } from "@/lib/auth-tokens";
import { checkDistributedRateLimit } from "@/lib/rate-limit";
import { createUserInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";
import { getUsers } from "@/lib/users";
import type { UserRole } from "@/lib/types";

type SocialProvider = "google" | "facebook";

function safeRole(value: FormDataEntryValue | null): UserRole {
  return value === "host" ? "host" : "guest";
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]?.toUpperCase()).join("").slice(0, 2) || "U";
}

function safeNextPath(value: FormDataEntryValue | null) {
  const path = String(value ?? "");
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

function authErrorTarget(path: "/login" | "/register" | "/admin/login", message: string, formData: FormData, role?: FormDataEntryValue | null) {
  const params = new URLSearchParams({ error: message });
  if (role === "host" || role === "guest" || role === "admin") params.set("role", role);
  const nextPath = safeNextPath(formData.get("next"));
  if (nextPath) params.set("next", nextPath);
  return `${path}?${params.toString()}`;
}

export async function signIn(formData: FormData) {
  const requestedRole = formData.get("requestedRole");
  const headerStore = await headers();
  const rateLimit = await checkDistributedRateLimit(`signin:${headerStore.get("x-forwarded-for") ?? "local"}`, 10);
  if (rateLimit.limited) {
    logger.warn("signin_rate_limited");
    redirect(authErrorTarget(requestedRole === "admin" ? "/admin/login" : "/login", "Too many login attempts. Please try again later.", formData, requestedRole));
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const users = await getUsers();
  const user = users.find((item) => item.email.toLowerCase() === email);
  const errorPath = requestedRole === "admin" ? "/admin/login" : "/login";

  if (!user || !verifyPassword(password, user.passwordHash)) {
    logger.warn("signin_failed", { email });
    redirect(authErrorTarget(errorPath, "Incorrect email or password.", formData, requestedRole));
  }

  if (
    (requestedRole === "host" || requestedRole === "guest" || requestedRole === "admin") &&
    user.role !== requestedRole
  ) {
    redirect(authErrorTarget(errorPath, `Use a ${requestedRole} account to continue.`, formData, requestedRole));
  }

  await createSession(user.id);
  logger.info("signin_success", { userId: user.id, role: user.role });
  redirect(safeNextPath(formData.get("next")) ?? roleHome(user.role));
}

export async function signUp(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = safeRole(formData.get("role"));

  if (name.length < 2 || !email.includes("@") || password.length < 8) {
    redirect(authErrorTarget("/register", "Use a valid name, email, and password with at least 8 characters.", formData, role));
  }

  const users = await getUsers();
  if (users.some((user) => user.email.toLowerCase() === email)) {
    redirect(authErrorTarget("/register", "An account with that email already exists.", formData, role));
  }

  const user = {
    id: randomUUID(),
    name,
    email,
    role,
    avatar: initials(name),
    phone: "",
    createdAt: new Date().toISOString().slice(0, 10),
    passwordHash: hashPassword(password),
  };
  if (usesPrismaPersistence()) {
    await createUserInDatabase(user);
  } else {
    const storedUsers = await readStoredUsers();
    await writeStoredUsers([user, ...storedUsers]);
  }
  await sendWelcomeEmail(user.email, user.name);
  const verificationToken = await issueAuthToken(user.id, "email_verification");
  await sendVerificationEmail({ to: user.email, name: user.name, token: verificationToken });
  await createSession(user.id);
  redirect(safeNextPath(formData.get("next")) ?? roleHome(role));
}

export async function signUpHost(formData: FormData) {
  formData.set("role", "host");
  await signUp(formData);
}

export async function signOut() {
  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  await clearSession();
  redirect("/");
}

function socialAuthErrorTarget(formData: FormData | undefined, message: string) {
  const mode = formData?.get("authMode") === "register" ? "register" : "login";
  const role = formData?.get("requestedRole");
  const roleParam = role === "host" || role === "guest" || role === "admin" ? `&role=${role}` : "";
  const nextPath = formData ? safeNextPath(formData.get("next")) : null;
  const nextParam = nextPath ? `&next=${encodeURIComponent(nextPath)}` : "";
  return `/${mode}?error=${encodeURIComponent(message)}${roleParam}${nextParam}`;
}

async function signInWithSocialProvider(provider: SocialProvider, label: string, formData?: FormData) {
  if (!hasSupabaseConfig()) {
    redirect(socialAuthErrorTarget(formData, `${label} login is not configured yet. Add Supabase environment variables first.`));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
    },
  });

  if (error || !data.url) {
    logger.warn("social_oauth_start_failed", { provider, error: error?.message });
    redirect(socialAuthErrorTarget(formData, `${label} login could not start. Please try again.`));
  }

  redirect(data.url);
}

export async function signInWithGoogle(formData?: FormData) {
  await signInWithSocialProvider("google", "Google", formData);
}

export async function signInWithFacebook(formData?: FormData) {
  await signInWithSocialProvider("facebook", "Facebook", formData);
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = (await getUsers()).find((item) => item.email.toLowerCase() === email);
  if (user) {
    const token = await issueAuthToken(user.id, "password_reset");
    await sendPasswordResetEmail({ to: user.email, name: user.name, token });
  }
  redirect(`/forgot-password?sent=1`);
}

export async function resetPassword(token: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect(`/reset-password/${token}?error=${encodeURIComponent("Use at least 8 characters.")}`);
  const authToken = await consumeAuthToken(token, "password_reset");
  if (!authToken) redirect(`/forgot-password?error=${encodeURIComponent("That reset link is invalid or expired.")}`);
  await updateUserPassword(authToken.userId, hashPassword(password));
  redirect(`/login?message=${encodeURIComponent("Password updated. Please sign in.")}`);
}

export async function verifyEmailToken(token: string) {
  const authToken = await consumeAuthToken(token, "email_verification");
  if (!authToken) return false;
  await markUserEmailVerified(authToken.userId);
  return true;
}
