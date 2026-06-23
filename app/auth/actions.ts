"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearPendingAdminMfaChallenge, createAdminMfaCode, createPendingAdminMfaChallenge, isAdminMfaCodeValid, readPendingAdminMfaChallenge } from "@/lib/admin-mfa";
import { appendAuditLog } from "@/lib/audit-logs";
import { clearAllSessionsForUser, clearSession, createSession, hashPassword, requireUser, roleHome, verifyPassword } from "@/lib/auth";
import { env } from "@/lib/env";
import { sendAdminMfaEmail, sendPasswordChangedEmail, sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { createEmailVerificationCode, hashEmailVerificationCode, normalizeEmailVerificationCode } from "@/lib/email-verification-code";
import { logger } from "@/lib/logger";
import { normalizeKnownAppPath } from "@/lib/canonical-paths";
import { completeEmailChange, consumeAuthToken, consumeEmailVerificationCode, getAuthToken, hashAuthTokenValue, issueAuthToken, markUserEmailVerified, updateUserPassword } from "@/lib/auth-tokens";
import { passwordPolicyMessage } from "@/lib/password-policy";
import { checkDistributedRateLimit, checkLoginLockout, clearFailedLoginAttempts, recordFailedLoginAttempt } from "@/lib/rate-limit";
import { createUserInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { assertTrustedRequestOrigin, isTrustedRequestOrigin } from "@/lib/request-safety";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";
import { getUserById, getUsers } from "@/lib/users";
import type { User, UserRole } from "@/lib/types";

type SocialProvider = "google" | "facebook";
const verificationCodeSentMessage = "We sent a 6-digit verification code to your email.";

function safeRole(value: FormDataEntryValue | null): UserRole {
  return value === "host" ? "host" : "guest";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]?.toUpperCase()).join("").slice(0, 2) || "U";
}

function safeNextPath(value: FormDataEntryValue | null) {
  const path = String(value ?? "");
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return normalizeKnownAppPath(path);
}

function authErrorTarget(path: "/login" | "/register" | "/admin/login", message: string, formData: FormData, role?: FormDataEntryValue | null) {
  const params = new URLSearchParams({ error: message });
  if (role === "host" || role === "guest" || role === "admin") params.set("role", role);
  const nextPath = safeNextPath(formData.get("next"));
  if (nextPath) params.set("next", nextPath);
  return `${path}?${params.toString()}`;
}

function verificationTarget(kind: "error" | "message", message: string, formData: FormData, email?: string, role?: FormDataEntryValue | null) {
  const params = new URLSearchParams({ [kind]: message });
  if (email) params.set("email", email);
  if (role === "host" || role === "guest" || role === "admin") params.set("role", role);
  const nextPath = safeNextPath(formData.get("next"));
  if (nextPath) params.set("next", nextPath);
  return `/verify-email?${params.toString()}`;
}

function loginNoticeTarget(message: string, formData: FormData, role?: FormDataEntryValue | null) {
  const params = new URLSearchParams({ message });
  if (role === "host" || role === "guest" || role === "admin") params.set("role", role);
  const nextPath = safeNextPath(formData.get("next"));
  if (nextPath) params.set("next", nextPath);
  return `${role === "admin" ? "/admin/login" : "/login"}?${params.toString()}`;
}

function adminMfaTarget(kind: "error" | "message", message: string, formData: FormData) {
  const params = new URLSearchParams({ mfa: "1", [kind]: message });
  const nextPath = safeNextPath(formData.get("next"));
  if (nextPath?.startsWith("/admin")) params.set("next", nextPath);
  return `/admin/login?${params.toString()}`;
}

function resetPasswordTarget(token: string, message: string) {
  return `/reset-password/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`;
}

function genericResetLinkFailure() {
  return `/forgot-password?error=${encodeURIComponent("This reset link is invalid or expired.")}`;
}

function clientIp(headerStore: Headers) {
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function loginThrottleKeys(email: string, ip: string) {
  return [`signin:ip:${ip}`, `signin:email:${email}`];
}

function loginLockoutMessage(retryAfterSeconds?: number) {
  if (!retryAfterSeconds) return "Too many login attempts. Please try again later.";
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many login attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

function auditHash(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 24);
}

function auditRequestedRole(value: FormDataEntryValue | null) {
  return value === "admin" || value === "host" || value === "guest" ? value : undefined;
}

async function appendLoginFailureAudit(input: {
  email: string;
  ip: string;
  reason: string;
  requestedRole?: UserRole;
  user?: User | null;
}) {
  await appendAuditLog({
    actorId: input.user?.id ?? "anonymous",
    actorRole: input.user?.role ?? "system",
    action: "auth.login_failed",
    entityType: input.user ? "user" : "login_identifier",
    entityId: input.user?.id ?? `email:${auditHash(input.email || "missing")}`,
    metadata: {
      reason: input.reason,
      requestedRole: input.requestedRole,
      emailHash: auditHash(input.email || "missing"),
      ipHash: auditHash(input.ip || "local"),
    },
  });
}

async function sendPasswordResetForUser(user: { id: string; email: string; name: string }) {
  const token = await issueAuthToken(user.id, "password_reset");
  await sendPasswordResetEmail({ to: user.email, name: user.name, token });
}

async function sendEmailVerificationForUser(user: { id: string; email: string; name: string }) {
  const code = createEmailVerificationCode();
  const token = await issueAuthToken(user.id, "email_verification", {
    codeHash: hashEmailVerificationCode({ userId: user.id, email: user.email, code }),
  });
  await sendVerificationEmail({ to: user.email, name: user.name, token, code });
}

async function startAdminMfaChallenge(user: { id: string; email: string; name: string }, formData: FormData) {
  const token = await issueAuthToken(user.id, "admin_mfa");
  const code = createAdminMfaCode(token);
  await createPendingAdminMfaChallenge(token);
  await sendAdminMfaEmail({ to: user.email, name: user.name, code });
  logger.info("admin_mfa_challenge_issued", { userId: user.id });
  redirect(adminMfaTarget("message", "Enter the 6-digit code sent to the admin email.", formData));
}

export async function signIn(formData: FormData) {
  const requestedRole = formData.get("requestedRole");
  const headerStore = await assertTrustedRequestOrigin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = clientIp(headerStore);
  const errorPath = requestedRole === "admin" ? "/admin/login" : "/login";
  const throttleKeys = loginThrottleKeys(email || "missing", ip);
  const lockout = await checkLoginLockout(throttleKeys);
  if (lockout.limited) {
    logger.warn("signin_progressive_lockout", { email, ip });
    await appendLoginFailureAudit({
      email,
      ip,
      reason: "progressive_lockout",
      requestedRole: auditRequestedRole(requestedRole),
    });
    redirect(authErrorTarget(errorPath, loginLockoutMessage(lockout.retryAfterSeconds), formData, requestedRole));
  }

  const rateLimit = await checkDistributedRateLimit(`signin:${ip}`, 20);
  if (rateLimit.limited) {
    logger.warn("signin_rate_limited");
    await appendLoginFailureAudit({
      email,
      ip,
      reason: "rate_limited",
      requestedRole: auditRequestedRole(requestedRole),
    });
    redirect(authErrorTarget(errorPath, "Too many login attempts. Please try again later.", formData, requestedRole));
  }

  const users = await getUsers();
  const user = users.find((item) => item.email.toLowerCase() === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    logger.warn("signin_failed", { email });
    await appendLoginFailureAudit({
      email,
      ip,
      reason: "invalid_credentials",
      requestedRole: auditRequestedRole(requestedRole),
      user,
    });
    const failedAttempt = await recordFailedLoginAttempt(throttleKeys);
    if (failedAttempt.limited) {
      redirect(authErrorTarget(errorPath, loginLockoutMessage(failedAttempt.retryAfterSeconds), formData, requestedRole));
    }
    redirect(authErrorTarget(errorPath, "Incorrect email or password.", formData, requestedRole));
  }

  if ((requestedRole === "host" || requestedRole === "guest" || requestedRole === "admin") && user.role !== requestedRole) {
    await appendLoginFailureAudit({
      email,
      ip,
      reason: "role_mismatch",
      requestedRole,
      user,
    });
    await recordFailedLoginAttempt(throttleKeys);
    redirect(authErrorTarget(errorPath, `Use a ${requestedRole} account to continue.`, formData, requestedRole));
  }

  await clearFailedLoginAttempts(throttleKeys);

  if (!user.emailVerifiedAt) {
    await sendEmailVerificationForUser(user);
    redirect(verificationTarget("message", "Verify your email before logging in. We sent a 6-digit verification code.", formData, user.email, requestedRole ?? user.role));
  }

  if (user.role === "admin") {
    await startAdminMfaChallenge(user, formData);
  }

  await createSession(user.id);
  logger.info("signin_success", { userId: user.id, role: user.role });
  redirect(safeNextPath(formData.get("next")) ?? roleHome(user.role));
}

export async function verifyAdminMfa(formData: FormData) {
  const headerStore = await headers();
  const rawToken = await readPendingAdminMfaChallenge();
  const tokenKey = rawToken ? hashAuthTokenValue(rawToken).slice(0, 16) : "missing";
  const rateLimit = await checkDistributedRateLimit(`admin-mfa:${headerStore.get("x-forwarded-for") ?? "local"}:${tokenKey}`, 5, 10 * 60_000);
  if (rateLimit.limited) {
    logger.warn("admin_mfa_rate_limited");
    redirect(adminMfaTarget("error", "Too many code attempts. Log in again to request a new code.", formData));
  }

  if (!isTrustedRequestOrigin(headerStore)) {
    logger.warn("admin_mfa_untrusted_origin");
    await clearPendingAdminMfaChallenge();
    redirect("/admin/login?error=Admin sign-in challenge expired. Log in again.");
  }

  if (!rawToken) {
    redirect("/admin/login?error=Admin sign-in challenge expired. Log in again.");
  }

  const pendingToken = await getAuthToken(rawToken, "admin_mfa");
  if (!pendingToken) {
    await clearPendingAdminMfaChallenge();
    redirect("/admin/login?error=Admin sign-in challenge expired. Log in again.");
  }

  const code = String(formData.get("code") ?? "");
  if (!isAdminMfaCodeValid(rawToken, code)) {
    logger.warn("admin_mfa_failed", { userId: pendingToken.userId });
    redirect(adminMfaTarget("error", "Incorrect or expired admin code.", formData));
  }

  const user = await getUserById(pendingToken.userId);
  if (!user || user.role !== "admin") {
    await consumeAuthToken(rawToken, "admin_mfa");
    await clearPendingAdminMfaChallenge();
    redirect("/admin/login?error=Admin sign-in challenge expired. Log in again.");
  }

  const consumedToken = await consumeAuthToken(rawToken, "admin_mfa");
  if (!consumedToken || consumedToken.userId !== user.id) {
    await clearPendingAdminMfaChallenge();
    redirect("/admin/login?error=Admin sign-in challenge expired. Log in again.");
  }

  await clearPendingAdminMfaChallenge();
  await createSession(user.id);
  logger.info("admin_mfa_success", { userId: user.id });
  const nextPath = safeNextPath(formData.get("next"));
  redirect(nextPath?.startsWith("/admin") ? nextPath : roleHome(user.role));
}

export async function resendAdminMfa(formData: FormData) {
  const headerStore = await headers();
  const rawToken = await readPendingAdminMfaChallenge();
  const ip = clientIp(headerStore);

  if (!isTrustedRequestOrigin(headerStore)) {
    logger.warn("admin_mfa_resend_untrusted_origin");
    await clearPendingAdminMfaChallenge();
    redirect("/admin/login?error=Admin sign-in challenge expired. Log in again.");
  }

  if (!rawToken) {
    redirect("/admin/login?error=Admin sign-in challenge expired. Log in again.");
  }

  const pendingToken = await getAuthToken(rawToken, "admin_mfa");
  if (!pendingToken) {
    await clearPendingAdminMfaChallenge();
    redirect("/admin/login?error=Admin sign-in challenge expired. Log in again.");
  }

  const rateLimit = await checkDistributedRateLimit(`admin-mfa-resend:${ip}:${pendingToken.userId}`, 3, 10 * 60_000);
  if (rateLimit.limited) {
    logger.warn("admin_mfa_resend_rate_limited", { userId: pendingToken.userId });
    redirect(adminMfaTarget("error", "Too many resend requests. Please wait before requesting another code.", formData));
  }

  const user = await getUserById(pendingToken.userId);
  if (!user || user.role !== "admin") {
    await consumeAuthToken(rawToken, "admin_mfa");
    await clearPendingAdminMfaChallenge();
    redirect("/admin/login?error=Admin sign-in challenge expired. Log in again.");
  }

  const freshToken = await issueAuthToken(user.id, "admin_mfa");
  await createPendingAdminMfaChallenge(freshToken);
  await sendAdminMfaEmail({ to: user.email, name: user.name, code: createAdminMfaCode(freshToken) });
  logger.info("admin_mfa_code_resent", { userId: user.id });
  redirect(adminMfaTarget("message", "We sent a new admin code.", formData));
}

export async function signUp(formData: FormData) {
  await assertTrustedRequestOrigin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const role = safeRole(formData.get("role"));

  if (name.length < 2) {
    redirect(authErrorTarget("/register", "Enter your full name.", formData, role));
  }

  if (!isValidEmail(email)) {
    redirect(authErrorTarget("/register", "Enter a valid email address.", formData, role));
  }

  if (password !== confirmPassword) {
    redirect(authErrorTarget("/register", "Passwords do not match.", formData, role));
  }

  const passwordError = passwordPolicyMessage(password, { email, name });
  if (passwordError) redirect(authErrorTarget("/register", passwordError, formData, role));

  const users = await getUsers();
  const existingUser = users.find((user) => user.email.toLowerCase() === email);
  if (existingUser) {
    redirect(authErrorTarget("/register", "This email is already registered. Log in or use a different email.", formData, role));
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
  await sendEmailVerificationForUser(user);
  redirect(verificationTarget("message", verificationCodeSentMessage, formData, user.email, role));
}

export async function signUpHost(formData: FormData) {
  formData.set("role", "host");
  await signUp(formData);
}

export async function verifyEmailCode(formData: FormData) {
  const headerStore = await assertTrustedRequestOrigin();
  const role = formData.get("role");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = normalizeEmailVerificationCode(String(formData.get("code") ?? ""));

  if (!email.includes("@") || !/^\d{6}$/.test(code)) {
    redirect(verificationTarget("error", "Enter the email and 6-digit verification code we sent.", formData, email, role));
  }

  const rateLimit = await checkDistributedRateLimit(`email-verification:${clientIp(headerStore)}:${email}`, 8, 15 * 60_000);
  if (rateLimit.limited) {
    logger.warn("email_verification_rate_limited");
    redirect(verificationTarget("error", "Too many verification attempts. Please try again later.", formData, email, role));
  }

  const user = (await getUsers()).find((item) => item.email.toLowerCase() === email);
  if (!user) {
    redirect(verificationTarget("error", "No account was found for that email.", formData, email, role));
  }

  if (user.emailVerifiedAt) {
    redirect(loginNoticeTarget("Email already verified. Please log in.", formData, role));
  }

  const codeHash = hashEmailVerificationCode({ userId: user.id, email: user.email, code });
  const authToken = await consumeEmailVerificationCode(user.id, codeHash);
  if (!authToken || authToken.userId !== user.id) {
    redirect(verificationTarget("error", "Incorrect or expired verification code.", formData, email, role));
  }

  await markUserEmailVerified(user.id);
  redirect(loginNoticeTarget("Email verified. You can now log in.", formData, role));
}

export async function resendVerificationCode(formData: FormData) {
  const headerStore = await assertTrustedRequestOrigin();
  const role = formData.get("role");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email.includes("@")) {
    redirect(verificationTarget("error", "Enter the email address for your account.", formData, email, role));
  }

  const rateLimit = await checkDistributedRateLimit(`email-verification-resend:${clientIp(headerStore)}:${email}`, 3, 15 * 60_000);
  if (rateLimit.limited) {
    logger.warn("email_verification_resend_rate_limited");
    redirect(verificationTarget("error", "Too many resend requests. Please wait before requesting another code.", formData, email, role));
  }

  const user = (await getUsers()).find((item) => item.email.toLowerCase() === email);
  if (!user) {
    redirect(verificationTarget("error", "No account was found for that email.", formData, email, role));
  }

  if (user.emailVerifiedAt) {
    redirect(loginNoticeTarget("Email already verified. Please log in.", formData, role));
  }

  await sendEmailVerificationForUser(user);
  redirect(verificationTarget("message", "We sent a new verification code.", formData, email, role));
}

export async function signOut() {
  await assertTrustedRequestOrigin();

  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  await clearSession();
  redirect("/");
}

export async function signOutAllDevices() {
  await assertTrustedRequestOrigin();

  const user = await requireUser({ redirectTo: "/login" });

  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  await clearAllSessionsForUser(user.id);
  await clearSession();
  redirect(`/login?message=${encodeURIComponent("You have been logged out from all devices.")}`);
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
  await assertTrustedRequestOrigin();

  if (!hasSupabaseConfig()) {
    redirect(socialAuthErrorTarget(formData, `${label} login is not configured yet. Add Supabase environment variables first.`));
  }

  const redirectTo = new URL("/auth/callback", env.NEXT_PUBLIC_APP_URL);
  const nextPath = formData ? safeNextPath(formData.get("next")) : null;
  if (nextPath) redirectTo.searchParams.set("next", nextPath);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo.toString(),
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
  const headerStore = await assertTrustedRequestOrigin();
  const rateLimit = await checkDistributedRateLimit(`password-reset-request:${headerStore.get("x-forwarded-for") ?? "local"}`, 5, 15 * 60_000);
  if (rateLimit.limited) {
    logger.warn("password_reset_request_rate_limited");
    redirect("/forgot-password?sent=1");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = (await getUsers()).find((item) => item.email.toLowerCase() === email);
  if (user) {
    await sendPasswordResetForUser(user);
    await appendAuditLog({
      actorId: "anonymous",
      actorRole: "system",
      action: "account.password_reset_requested",
      entityType: "user",
      entityId: user.id,
      metadata: {
        emailHash: auditHash(email),
        ipHash: auditHash(headerStore.get("x-forwarded-for") ?? "local"),
      },
    });
  }
  redirect("/forgot-password?sent=1");
}

export async function resetPassword(token: string, formData: FormData) {
  const headerStore = await headers();
  const tokenKey = hashAuthTokenValue(token).slice(0, 16);
  const rateLimit = await checkDistributedRateLimit(`password-reset:${headerStore.get("x-forwarded-for") ?? "local"}:${tokenKey}`, 5, 15 * 60_000);
  if (rateLimit.limited) {
    logger.warn("password_reset_rate_limited");
    redirect(resetPasswordTarget(token, "Too many attempts. Please try again later."));
  }

  if (!isTrustedRequestOrigin(headerStore)) {
    logger.warn("password_reset_untrusted_origin");
    redirect(genericResetLinkFailure());
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!email.includes("@")) redirect(resetPasswordTarget(token, "Confirm the email address for this account."));
  if (password !== confirmPassword) redirect(resetPasswordTarget(token, "Passwords do not match."));

  const basicPasswordError = passwordPolicyMessage(password);
  if (basicPasswordError) redirect(resetPasswordTarget(token, basicPasswordError));

  const pendingToken = await getAuthToken(token, "password_reset");
  if (!pendingToken) redirect(genericResetLinkFailure());

  const user = await getUserById(pendingToken.userId);
  if (!user) {
    await consumeAuthToken(token, "password_reset");
    redirect(genericResetLinkFailure());
  }

  if (user.email.toLowerCase() !== email) {
    redirect(resetPasswordTarget(token, "Email does not match this reset link."));
  }

  const accountPasswordError = passwordPolicyMessage(password, { email: user.email, name: user.name });
  if (accountPasswordError) redirect(resetPasswordTarget(token, accountPasswordError));

  const authToken = await consumeAuthToken(token, "password_reset");
  if (!authToken || authToken.userId !== user.id) redirect(genericResetLinkFailure());

  await updateUserPassword(authToken.userId, hashPassword(password));
  await appendAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: "account.password_reset_completed",
    entityType: "user",
    entityId: user.id,
    metadata: {
      sessionsRevoked: true,
    },
  });
  await sendPasswordChangedEmail({ to: user.email, name: user.name });
  await clearSession();
  redirect(`/login?message=${encodeURIComponent("Password changed successfully. We sent a confirmation to your email. Please log in again.")}`);
}

export async function verifyEmailToken(token: string) {
  await assertTrustedRequestOrigin();

  const emailChangeToken = await consumeAuthToken(token, "email_change");
  if (emailChangeToken) return completeEmailChange(emailChangeToken);

  const authToken = await consumeAuthToken(token, "email_verification");
  if (!authToken) return false;
  await markUserEmailVerified(authToken.userId);
  return true;
}
