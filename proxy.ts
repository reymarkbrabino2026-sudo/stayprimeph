import { NextRequest, NextResponse } from "next/server";
import { getCanonicalPathname } from "@/lib/canonical-paths";
import { corsHeaders } from "@/lib/cors";

const sessionCookieName = "stayprimeph_session";

const protectedRoutes: Array<{ prefix: string; role?: "admin" | "host" | "guest" }> = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/host", role: "host" },
  { prefix: "/guest", role: "guest" },
  { prefix: "/account-settings" },
];

// Proxy only rejects obviously unauthenticated traffic early. Role enforcement
// must stay in server layouts, server actions, and API routes via requireRole().

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getProtectedRoute(pathname: string) {
  if (pathname === "/admin/login") return undefined;
  return protectedRoutes.find((route) => matchesPrefix(pathname, route.prefix));
}

function withCorsHeaders(request: NextRequest, response: NextResponse) {
  if (!request.nextUrl.pathname.startsWith("/api/")) return response;

  const headers = corsHeaders(request.headers.get("origin"));
  if (!headers) return response;

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

function withSecurityHeaders(request: NextRequest, response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-Request-Id", crypto.randomUUID());
  return withCorsHeaders(request, response);
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(signature);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hasValidSession(value?: string) {
  const authSecret = process.env.AUTH_SECRET;
  if (!value) return false;

  // Current server-side sessions use an opaque 64-character token. The proxy
  // cannot query the session store, so it only performs the cheap early check
  // and lets server layouts/actions enforce the actual user and role.
  if (/^[a-f0-9]{64}$/i.test(value)) return true;

  if (!authSecret) return false;

  const parts = value.split(".");
  if (parts.length !== 3 && parts.length !== 4) return false;

  const isLegacySession = parts.length === 3;
  const [userId, issuedAtValue, expiresAtValue, signature] = isLegacySession
    ? [parts[0], "0", parts[1], parts[2]]
    : parts;
  const issuedAt = Number(issuedAtValue);
  const expiresAt = Number(expiresAtValue);
  if (!userId || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= Date.now() || !signature) return false;

  const payload = isLegacySession ? `${userId}.${expiresAtValue}` : `${userId}.${issuedAtValue}.${expiresAtValue}`;
  const expected = await hmacSha256(payload, authSecret);
  return constantTimeEqual(expected, signature);
}

function buildLoginUrl(request: NextRequest, role?: "admin" | "host" | "guest") {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = role === "admin" ? "/admin/login" : "/login";
  loginUrl.search = "";
  if (role && role !== "admin") loginUrl.searchParams.set("role", role);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return loginUrl;
}

export async function proxy(request: NextRequest) {
  if (request.method === "OPTIONS" && request.nextUrl.pathname.startsWith("/api/")) {
    const cors = corsHeaders(request.headers.get("origin"));
    return withSecurityHeaders(request, new NextResponse(null, { status: cors ? 204 : 403 }));
  }

  const canonicalPathname = getCanonicalPathname(request.nextUrl.pathname);
  if (canonicalPathname && canonicalPathname !== request.nextUrl.pathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = canonicalPathname;
    return withSecurityHeaders(request, NextResponse.redirect(redirectUrl));
  }

  const protectedRoute = getProtectedRoute(request.nextUrl.pathname);
  if (protectedRoute) {
    const sessionValue = request.cookies.get(sessionCookieName)?.value;
    const validSession = await hasValidSession(sessionValue);
    if (!validSession) {
      return withSecurityHeaders(request, NextResponse.redirect(buildLoginUrl(request, protectedRoute.role)));
    }
  }

  return withSecurityHeaders(request, NextResponse.next());
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
