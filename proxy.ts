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

async function hasValidSession(value?: string) {
  const authSecret = process.env.AUTH_SECRET;
  if (!value || !authSecret) return false;

  const [userId, expiresAtValue, signature] = value.split(".");
  const expiresAt = Number(expiresAtValue);
  if (!userId || !Number.isFinite(expiresAt) || expiresAt <= Date.now() || !signature) return false;

  const expected = await hmacSha256(`${userId}.${expiresAtValue}`, authSecret);
  return expected.length === signature.length && expected === signature;
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
