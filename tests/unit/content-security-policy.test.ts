import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, cspNonceHeaderName } from "@/lib/content-security-policy";

function directive(csp: string, name: string) {
  return csp.split("; ").find((entry) => entry.startsWith(`${name} `)) ?? "";
}

describe("content security policy", () => {
  it("builds a nonce-based script policy for production", () => {
    const csp = buildContentSecurityPolicy({ nonce: "test-nonce", isProduction: true });
    const script = directive(csp, "script-src");

    expect(cspNonceHeaderName).toBe("x-nonce");
    expect(script).toContain("'nonce-test-nonce'");
    expect(script).not.toContain("'strict-dynamic'");
    expect(script).toContain("https://js.stripe.com");
    expect(script).toContain("https://va.vercel-scripts.com");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(csp).toContain("script-src-elem 'self' 'nonce-test-nonce'");
    expect(csp).toContain("https://*.ingest.sentry.io");
    expect(csp).toContain("https://api.stripe.com");
    expect(csp).toContain("https://vitals.vercel-insights.com");
    expect(csp).toContain("https://a.tile.openstreetmap.org");
    expect(csp).toContain("https://*.basemaps.cartocdn.com");
    expect(csp).toContain("https://my.matterport.com");
    expect(csp).toContain("https://kuula.co");
    expect(csp).toContain("https://www.youtube.com");
    expect(csp).toContain("https://player.vimeo.com");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("keeps inline style attributes compatible without allowing inline scripts", () => {
    const csp = buildContentSecurityPolicy({ nonce: "style-nonce", isProduction: false });
    const script = directive(csp, "script-src");
    const style = directive(csp, "style-src");

    expect(script).toContain("'unsafe-eval'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(style).toContain("'nonce-style-nonce'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
