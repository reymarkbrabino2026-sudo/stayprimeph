import { describe, expect, it } from "vitest";
import { resolvePrismaDatasourceUrl } from "@/lib/prisma-datasource-url";

describe("resolvePrismaDatasourceUrl", () => {
  it("adds conservative Prisma pool settings for the Supabase transaction pooler", () => {
    const resolved = resolvePrismaDatasourceUrl(
      "postgresql://user:pass@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?schema=public",
      { isServerless: false },
    );
    const url = new URL(resolved);

    expect(url.searchParams.get("schema")).toBe("public");
    expect(url.searchParams.get("connection_limit")).toBe("1");
    expect(url.searchParams.get("pool_timeout")).toBe("20");
    expect(url.searchParams.get("connect_timeout")).toBe("30");
  });

  it("preserves explicitly configured Prisma pool settings", () => {
    const resolved = resolvePrismaDatasourceUrl(
      "postgresql://user:pass@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?connection_limit=3&pool_timeout=40&connect_timeout=15",
      { isServerless: true },
    );
    const url = new URL(resolved);

    expect(url.searchParams.get("connection_limit")).toBe("3");
    expect(url.searchParams.get("pool_timeout")).toBe("40");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
  });

  it("leaves ordinary non-serverless database urls unchanged", () => {
    const value = "postgresql://user:pass@localhost:5432/stayprimeph?schema=public";

    expect(resolvePrismaDatasourceUrl(value, { isServerless: false })).toBe(value);
  });
});
