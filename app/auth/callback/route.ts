import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminMfaCode, pendingAdminMfaCookie } from "@/lib/admin-mfa";
import { createSession, roleHome, sessionMetadataFromHeaders } from "@/lib/auth";
import { issueAuthToken } from "@/lib/auth-tokens";
import { normalizeKnownAppPath } from "@/lib/canonical-paths";
import { sendPrivilegedMfaEmail } from "@/lib/email";
import { createUserInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";
import { getUsers } from "@/lib/users";
import type { User, UserRole } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]?.toUpperCase()).join("").slice(0, 2) || "U";
}

function safeRedirectTarget(request: NextRequest, path: string) {
  return new URL(path, request.url);
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return normalizeKnownAppPath(value);
}

function safeRequestedRole(value: string | null): Extract<UserRole, "guest" | "host"> | null {
  return value === "host" || value === "guest" ? value : null;
}

function safeAuthMode(value: string | null) {
  return value === "register" ? "register" : "login";
}

function authErrorTarget(
  request: NextRequest,
  input: { mode: "login" | "register"; message: string; role?: "guest" | "host" | null; nextPath?: string | null },
) {
  const params = new URLSearchParams({ error: input.message });
  if (input.role) params.set("role", input.role);
  if (input.nextPath) params.set("next", input.nextPath);
  return safeRedirectTarget(request, `/${input.mode}?${params.toString()}`);
}

async function findOrCreateSocialUser(
  profile: { id: string; email: string; name: string; provider: string },
  requestedRole: Extract<UserRole, "guest" | "host"> = "guest",
): Promise<User> {
  const email = profile.email.trim().toLowerCase();
  const users = await getUsers();
  const existing = users.find((user) => user.email.toLowerCase() === email);
  if (existing) return existing;

  const user: User = {
    id: `supabase-${profile.id || randomUUID()}`,
    name: profile.name || email.split("@")[0] || `${profile.provider} User`,
    email,
    role: requestedRole,
    avatar: initials(profile.name || email),
    phone: "",
    createdAt: new Date().toISOString().slice(0, 10),
    emailVerifiedAt: new Date().toISOString(),
  };

  if (usesPrismaPersistence()) {
    await createUserInDatabase(user);
  } else {
    const storedUsers = await readStoredUsers();
    await writeStoredUsers([user, ...storedUsers]);
  }

  return user;
}

export async function GET(request: NextRequest) {
  const requestedRole = safeRequestedRole(request.nextUrl.searchParams.get("role"));
  const authMode = safeAuthMode(request.nextUrl.searchParams.get("mode"));
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !hasSupabaseConfig()) {
    return NextResponse.redirect(authErrorTarget(request, {
      mode: authMode,
      message: "Social login is not configured correctly.",
      role: requestedRole,
      nextPath,
    }));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(authErrorTarget(request, {
      mode: authMode,
      message: "Social login failed. Please try again.",
      role: requestedRole,
      nextPath,
    }));
  }

  const { data, error: userError } = await supabase.auth.getUser();
  const supabaseUser = data.user;
  const email = supabaseUser?.email;
  if (userError || !supabaseUser || !email) {
    return NextResponse.redirect(authErrorTarget(request, {
      mode: authMode,
      message: "The social provider did not return an email address.",
      role: requestedRole,
      nextPath,
    }));
  }

  const appUser = await findOrCreateSocialUser({
    id: supabaseUser.id,
    email,
    provider: supabaseUser.app_metadata?.provider ?? "Social",
    name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? email.split("@")[0],
  }, requestedRole ?? "guest");

  if (requestedRole && appUser.role !== requestedRole) {
    if (requestedRole === "host" && appUser.role === "guest") {
      await createSession(appUser.id, sessionMetadataFromHeaders(request.headers));
      return NextResponse.redirect(safeRedirectTarget(request, "/become-a-host/upgrade"));
    }

    await supabase.auth.signOut();
    return NextResponse.redirect(authErrorTarget(request, {
      mode: authMode,
      message: `Use a ${requestedRole} account to continue.`,
      role: requestedRole,
      nextPath,
    }));
  }

  if (appUser.role === "host") {
    const token = await issueAuthToken(appUser.id, "admin_mfa");
    await sendPrivilegedMfaEmail({
      to: appUser.email,
      name: appUser.name,
      code: createAdminMfaCode(token),
      role: "host",
    });
    const params = new URLSearchParams({ mfa: "1", role: "host", message: "Enter the 6-digit code sent to the host email." });
    if (nextPath && !nextPath.startsWith("/admin")) params.set("next", nextPath);
    const response = NextResponse.redirect(safeRedirectTarget(request, `/login?${params.toString()}`));
    const cookie = pendingAdminMfaCookie(token);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  }

  await createSession(appUser.id, sessionMetadataFromHeaders(request.headers));
  return NextResponse.redirect(safeRedirectTarget(request, nextPath ?? roleHome(appUser.role)));
}
