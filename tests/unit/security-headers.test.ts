import { describe, expect, test } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

describe("security headers", () => {
  test("defines a restrictive content security policy", async () => {
    const [proxy, csp] = await Promise.all([
      fs.readFile(path.join(process.cwd(), "proxy.ts"), "utf8"),
      fs.readFile(path.join(process.cwd(), "lib/content-security-policy.ts"), "utf8"),
    ]);

    expect(proxy).toContain("Content-Security-Policy");
    expect(proxy).toContain("createCspNonce");
    expect(proxy).toContain("NextResponse.next({ request: { headers: security.requestHeaders } })");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("nonceSource");
    expect(csp).toContain("script-src-elem");
    expect(csp).toContain("https://js.stripe.com");
    expect(csp).toContain("https://*.ingest.sentry.io");
    expect(csp).toContain("https://vitals.vercel-insights.com");
    expect(csp).toContain("https://res.cloudinary.com");
    expect(csp).toContain("https://*.public.blob.vercel-storage.com");
    expect(csp).toContain("https://a.tile.openstreetmap.org");
    expect(csp).toContain("https://b.tile.openstreetmap.org");
    expect(csp).toContain("https://c.tile.openstreetmap.org");
    expect(csp).not.toContain("default-src *");
    expect(csp).not.toContain("https://*.tile.openstreetmap.org");
  });

  test("keeps HSTS enabled for static and dynamic responses", async () => {
    const [config, proxy] = await Promise.all([
      fs.readFile(path.join(process.cwd(), "next.config.ts"), "utf8"),
      fs.readFile(path.join(process.cwd(), "proxy.ts"), "utf8"),
    ]);
    const hstsHeader = '"Strict-Transport-Security"';
    const hstsPolicy = '"max-age=31536000; includeSubDomains"';

    expect(config).toContain(hstsHeader);
    expect(config).toContain(hstsPolicy);
    expect(proxy).toContain(hstsHeader);
    expect(proxy).toContain(hstsPolicy);
  });

  test("allows configured listing photo hosts for next image optimization", async () => {
    const config = await fs.readFile(path.join(process.cwd(), "next.config.ts"), "utf8");

    expect(config).toContain('hostname: "res.cloudinary.com"');
    expect(config).toContain('hostname: "**.public.blob.vercel-storage.com"');
  });
});
