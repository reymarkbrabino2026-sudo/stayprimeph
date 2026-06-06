type LogMeta = Record<string, unknown>;

function write(level: "info" | "warn" | "error", event: string, meta: LogMeta = {}) {
  const payload = JSON.stringify({ level, event, ...meta, timestamp: new Date().toISOString() });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export const logger = {
  info: (event: string, meta?: LogMeta) => write("info", event, meta),
  warn: (event: string, meta?: LogMeta) => write("warn", event, meta),
  error: (event: string, meta?: LogMeta) => write("error", event, meta),
};
