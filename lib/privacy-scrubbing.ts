export type ScrubMeta = Record<string, unknown>;

export const redactedValue = "[redacted]";

const emailPattern = /(?<!\*)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const sensitiveInlinePattern = /\b(access[-_ ]?token|auth[-_ ]?token|token|secret|password|session|authorization|cookie|api[-_ ]?key|webhook[-_ ]?signature)\b\s*[:=]?\s*([A-Za-z0-9._~+/\-=]{6,})/gi;
const sensitiveQueryKeyPattern = /^(access_token|auth|code|credential|email|key|otp|pass|password|secret|session|signature|token|whsec)$/i;
const sensitiveKeyPattern = /(password|passcode|secret|token|authorization|cookie|session|api[-_]?key|private[-_]?key|database[-_]?url|direct[-_]?url|dsn|tax[-_]?id|vat[-_]?id|payout|account[-_]?number|routing[-_]?number|identity|address|phone|card|cvv|cvc|passport|birth|dob|webhook|signature)/i;
const emailKeyPattern = /(^|[-_])(?:email|to|from|recipient)(?:[-_]|$)/i;
const maxDepth = 6;

export function maskEmail(value: string) {
  const [local = "", domain = ""] = value.split("@");
  if (!domain) return redactedValue;
  const safeLocal = local.length <= 2 ? `${local[0] ?? "*"}***` : `${local[0]}***${local.at(-1)}`;
  return `${safeLocal}@${domain.toLowerCase()}`;
}

export function scrubString(value: string) {
  const withoutEmails = value
    .replace(emailPattern, (match) => maskEmail(match))
    .replace(sensitiveInlinePattern, (_match, label) => `${label}=${redactedValue}`);

  try {
    const url = new URL(withoutEmails);
    for (const key of [...url.searchParams.keys()]) {
      if (sensitiveQueryKeyPattern.test(key)) url.searchParams.set(key, redactedValue);
    }
    return url.toString();
  } catch {
    return withoutEmails.replace(
      /([?&](?:access_token|auth|code|credential|email|key|otp|pass|password|secret|session|signature|token|whsec)=)[^&#\s]+/gi,
      `$1${redactedValue}`,
    );
  }
}

export function scrubError(error: Error) {
  return {
    name: error.name,
    message: scrubString(error.message),
  };
}

export function scrubValue(value: unknown, key = "", depth = 0, seen = new WeakSet<object>()): unknown {
  if (key && sensitiveKeyPattern.test(key)) return redactedValue;

  if (typeof value === "string") {
    if (key && emailKeyPattern.test(key)) return maskEmail(value);
    return scrubString(value);
  }

  if (typeof value !== "object" || value === null) return value;
  if (value instanceof Error) return scrubError(value);
  if (depth >= maxDepth) return "[truncated]";
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, key, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value as ScrubMeta).map(([entryKey, entryValue]) => [
      entryKey,
      scrubValue(entryValue, entryKey, depth + 1, seen),
    ]),
  );
}

export function scrubMeta(meta: ScrubMeta) {
  return scrubValue(meta) as ScrubMeta;
}
