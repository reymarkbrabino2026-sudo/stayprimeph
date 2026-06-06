import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createSession, roleHome } from "@/lib/auth";
import { createUserInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";
import { getUsers } from "@/lib/users";
import type { User } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]?.toUpperCase()).join("").slice(0, 2) || "U";
}

function safeRedirectTarget(request: NextRequest, path: string) {
  return new URL(path, request.url);
}

async function findOrCreateSocialUser(profile: { id: string; email: string; name: string; provider: string }): Promise<User> {
  const email = profile.email.trim().toLowerCase();
  const users = await getUsers();
  const existing = users.find((user) => user.email.toLowerCase() === email);
  if (existing) return existing;

  const user: User = {
    id: `supabase-${profile.id || randomUUID()}`,
    name: profile.name || email.split("@")[0] || `${profile.provider} User`,
    email,
    role: "guest",
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
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !hasSupabaseConfig()) {
    return NextResponse.redirect(safeRedirectTarget(request, `/login?error=${encodeURIComponent("Social login is not configured correctly.")}`));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(safeRedirectTarget(request, `/login?error=${encodeURIComponent("Social login failed. Please try again.")}`));
  }

  const { data, error: userError } = await supabase.auth.getUser();
  const supabaseUser = data.user;
  const email = supabaseUser?.email;
  if (userError || !supabaseUser || !email) {
    return NextResponse.redirect(safeRedirectTarget(request, `/login?error=${encodeURIComponent("The social provider did not return an email address.")}`));
  }

  const appUser = await findOrCreateSocialUser({
    id: supabaseUser.id,
    email,
    provider: supabaseUser.app_metadata?.provider ?? "Social",
    name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? email.split("@")[0],
  });

  await createSession(appUser.id);
  return NextResponse.redirect(safeRedirectTarget(request, roleHome(appUser.role)));
}
