import { NextRequest, NextResponse } from "next/server";

const sessionCookieName = "stayprimeph_session";

const protectedRoutes: Array<{ prefix: string; role?: "admin" | "host" | "guest" }> = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/host", role: "host" },
  { prefix: "/guest", role: "guest" },
  { prefix: "/account-settings" },
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getProtectedRoute(pathname: string) {
  return protectedRoutes.find((route) => matchesPrefix(pathname, route.prefix));
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-Request-Id", crypto.randomUUID());
  return response;
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
  if (!value || !authSecret) return false;

  const [userId, expiresAtValue, signature] = value.split(".");
  const expiresAt = Number(expiresAtValue);
  if (!userId || !Number.isFinite(expiresAt) || expiresAt <= Date.now() || !signature) return false;

  const expected = await hmacSha256(`${userId}.${expiresAtValue}`, authSecret);
  return constantTimeEqual(expected, signature);
}

function buildLoginUrl(request: NextRequest, role?: "admin" | "host" | "guest") {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (role) loginUrl.searchParams.set("role", role);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return loginUrl;
}

export async function proxy(request: NextRequest) {
  const protectedRoute = getProtectedRoute(request.nextUrl.pathname);
  if (protectedRoute) {
    const sessionValue = request.cookies.get(sessionCookieName)?.value;
    const validSession = await hasValidSession(sessionValue);
    if (!validSession) {
      return withSecurityHeaders(NextResponse.redirect(buildLoginUrl(request, protectedRoute.role)));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
