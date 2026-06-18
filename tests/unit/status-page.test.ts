import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("public status page", () => {
  test("does not expose internal provider readiness or environment checks", async () => {
    const source = await fs.readFile(path.join(process.cwd(), "app/status/page.tsx"), "utf8");

    expect(source).not.toContain("process.env");
    expect(source).not.toContain("CLOUDINARY");
    expect(source).not.toContain("BLOB_READ_WRITE_TOKEN");
    expect(source).not.toContain("RESEND_API_KEY");
    expect(source).not.toContain("UPSTASH");
    expect(source).not.toContain("SENTRY");
    expect(source).not.toContain("PAYMENT_LAUNCH_MODE");
    expect(source).not.toContain("Configuration needed");
    expect(source).not.toContain("Disabled");
    expect(source).toContain("public summary");
  });
});
