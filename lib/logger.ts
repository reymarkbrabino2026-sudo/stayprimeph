type LogMeta = Record<string, unknown>;

const redacted = "[redacted]";
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const sensitiveKeyPattern = /(password|passcode|secret|token|authorization|cookie|session|api[-_]?key|private[-_]?key|database[-_]?url|direct[-_]?url|dsn|tax[-_]?id|vat[-_]?id|payout|account[-_]?number|routing[-_]?number|identity|address|phone)/i;
const emailKeyPattern = /(^|[-_])(?:email|to|from|recipient)(?:[-_]|$)/i;
const maxDepth = 6;

function maskEmail(value: string) {
  const [local = "", domain = ""] = value.split("@");
  if (!domain) return redacted;
  const safeLocal = local.length <= 2 ? `${local[0] ?? "*"}***` : `${local[0]}***${local.at(-1)}`;
  return `${safeLocal}@${domain.toLowerCase()}`;
}

function sanitizeString(value: string) {
  return value.replace(emailPattern, (match) => maskEmail(match));
}

function sanitizeError(error: Error) {
  return {
    name: error.name,
    message: sanitizeString(error.message),
  };
}

function sanitizeValue(value: unknown, key = "", depth = 0, seen = new WeakSet<object>()): unknown {
  if (key && sensitiveKeyPattern.test(key)) return redacted;

  if (typeof value === "string") {
    if (key && emailKeyPattern.test(key)) return maskEmail(value);
    return sanitizeString(value);
  }

  if (typeof value !== "object" || value === null) return value;
  if (value instanceof Error) return sanitizeError(value);
  if (depth >= maxDepth) return "[truncated]";
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeValue(entryValue, entryKey, depth + 1, seen),
    ]),
  );
}

function sanitizeMeta(meta: LogMeta) {
  return sanitizeValue(meta) as LogMeta;
}

function write(level: "info" | "warn" | "error", event: string, meta: LogMeta = {}) {
  const payload = JSON.stringify({ level, event, ...sanitizeMeta(meta), timestamp: new Date().toISOString() });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export const logSanitizer = {
  maskEmail,
  sanitizeMeta,
  sanitizeString,
};

export const logger = {
  info: (event: string, meta?: LogMeta) => write("info", event, meta),
  warn: (event: string, meta?: LogMeta) => write("warn", event, meta),
  error: (event: string, meta?: LogMeta) => write("error", event, meta),
};
