import { describe, expect, test } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

describe("security headers", () => {
  test("defines a restrictive content security policy", async () => {
    const config = await fs.readFile(path.join(process.cwd(), "next.config.ts"), "utf8");

    expect(config).toContain("Content-Security-Policy");
    expect(config).toContain("default-src 'self'");
    expect(config).toContain("object-src 'none'");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("base-uri 'self'");
    expect(config).toContain("form-action 'self'");
    expect(config).toContain("https://res.cloudinary.com");
    expect(config).toContain("https://*.public.blob.vercel-storage.com");
    expect(config).toContain("https://a.tile.openstreetmap.org");
    expect(config).toContain("https://b.tile.openstreetmap.org");
    expect(config).toContain("https://c.tile.openstreetmap.org");
    expect(config).toContain("isProduction ? \"\" : \"https://va.vercel-scripts.com\"");
    expect(config).not.toContain("default-src *");
    expect(config).not.toContain("https://*.tile.openstreetmap.org");
    expect(config).not.toContain("https://*.vercel-insights.com");
    expect(config).not.toContain("blob: https://res.cloudinary.com");
  });
});
