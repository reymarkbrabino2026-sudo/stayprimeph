type DatasourceUrlOptions = {
  isServerless?: boolean;
};

function isPostgresProtocol(protocol: string) {
  return protocol === "postgresql:" || protocol === "postgres:";
}

function isSupabasePooler(hostname: string) {
  return hostname.endsWith(".pooler.supabase.com");
}

export function resolvePrismaDatasourceUrl(value: string, options: DatasourceUrlOptions = {}) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (!isPostgresProtocol(url.protocol)) return value;

  const isServerless = options.isServerless ?? Boolean(process.env.VERCEL);
  const isSupabaseTransactionPooler = isSupabasePooler(url.hostname) && url.port === "6543";
  if (!isServerless && !isSupabaseTransactionPooler) return value;

  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
  if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "30");

  return url.toString();
}
