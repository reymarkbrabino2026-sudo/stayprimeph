import "server-only";

import { headers } from "next/headers";

import { env } from "@/lib/env";

export const untrustedRequestMessage = "Request origin could not be verified.";

function normalizeHost(value: string | null | undefined) {
  const host = value?.split(",")[0]?.trim().toLowerCase();
  return host || null;
}

function trustedHosts() {
  const hosts = new Set<string>();
  hosts.add(new URL(env.NEXT_PUBLIC_APP_URL).host.toLowerCase());

  const vercelUrl = process.env.VERCEL_URL?.trim().toLowerCase();
  if (vercelUrl) hosts.add(vercelUrl);

  if (process.env.NODE_ENV !== "production") {
    hosts.add("localhost:3000");
    hosts.add("127.0.0.1:3000");
  }

  return hosts;
}

export function getRequestHost(headerStore: Headers) {
  return normalizeHost(headerStore.get("x-forwarded-host") ?? headerStore.get("host"));
}

export function isTrustedRequestOrigin(headerStore: Headers) {
  const requestHost = getRequestHost(headerStore);
  const allowedHosts = trustedHosts();
  if (!requestHost || !allowedHosts.has(requestHost)) return false;

  const origin = headerStore.get("origin");
  if (!origin) return true;

  try {
    const originHost = normalizeHost(new URL(origin).host);
    return Boolean(originHost && (originHost === requestHost || allowedHosts.has(originHost)));
  } catch {
    return false;
  }
}

export async function assertTrustedRequestOrigin() {
  const headerStore = await headers();
  if (!isTrustedRequestOrigin(headerStore)) {
    throw new Error(untrustedRequestMessage);
  }
  return headerStore;
}
