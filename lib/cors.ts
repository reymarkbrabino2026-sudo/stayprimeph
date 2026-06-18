const corsOriginsEnv = "API_CORS_ALLOWED_ORIGINS";
const allowedMethods = "GET, POST, OPTIONS";
const allowedHeaders = "Content-Type, Authorization, X-CSRF-Token";
const maxAgeSeconds = "600";

function normalizeOrigin(value: string) {
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function configuredCorsOrigins() {
  return new Set(
    (process.env[corsOriginsEnv] ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin && origin !== "*")
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin)),
  );
}

export function allowedCorsOrigin(origin: string | null) {
  if (!origin) return null;
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return null;
  return configuredCorsOrigins().has(normalizedOrigin) ? normalizedOrigin : null;
}

export function corsHeaders(origin: string | null) {
  const allowedOrigin = allowedCorsOrigin(origin);
  if (!allowedOrigin) return null;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": allowedMethods,
    "Access-Control-Allow-Headers": allowedHeaders,
    "Access-Control-Max-Age": maxAgeSeconds,
    Vary: "Origin",
  };
}
