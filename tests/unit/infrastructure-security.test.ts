import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = process.cwd();

async function readRepoFile(file: string) {
  return fs.readFile(path.join(repoRoot, file), "utf8");
}

describe("infrastructure security controls", () => {
  test("runs security checks in GitHub Actions", async () => {
    const workflow = await readRepoFile(".github/workflows/security-ci.yml");

    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npm run type-check");
    expect(workflow).toContain("npm run test:unit");
    expect(workflow).toContain("npx prisma validate");
    expect(workflow).toContain("npm run prod:check");
    expect(workflow).toContain("npm audit --audit-level=high");
    expect(workflow).toContain("Reject committed local secret files");
  });

  test("keeps static and dynamic security headers aligned", async () => {
    const [nextConfig, proxy] = await Promise.all([
      readRepoFile("next.config.ts"),
      readRepoFile("proxy.ts"),
    ]);
    const requiredHeaders = [
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Strict-Transport-Security",
      "Cross-Origin-Opener-Policy",
      "Cross-Origin-Resource-Policy",
    ];

    for (const header of requiredHeaders) {
      expect(nextConfig).toContain(header);
      if (header !== "Content-Security-Policy") expect(proxy).toContain(header);
    }
  });

  test("uses sanitized build-time placeholders instead of production secrets", async () => {
    const [vercelBuild, dockerfile] = await Promise.all([
      readRepoFile("scripts/vercel-build.mjs"),
      readRepoFile("Dockerfile"),
    ]);

    expect(vercelBuild).toContain("STAYPRIMEPH_BUILD_PHASE");
    expect(vercelBuild).toContain("build-time-placeholder-with-32-plus-characters");
    expect(vercelBuild).toContain('PERSISTENCE_DRIVER: "json"');
    expect(vercelBuild).not.toContain("sk_live_");
    expect(vercelBuild).not.toContain("pk_live_");
    expect(dockerfile).toContain("STAYPRIMEPH_BUILD_PHASE=1");
    expect(dockerfile).toContain("build-time-placeholder-with-32-plus-characters");
    expect(dockerfile).not.toContain("ARG DATABASE_URL");
    expect(dockerfile).not.toContain("ARG AUTH_SECRET");
    expect(dockerfile).not.toContain("sk_live_");
  });
});
