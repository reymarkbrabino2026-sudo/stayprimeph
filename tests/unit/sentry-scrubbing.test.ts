import { describe, expect, test } from "vitest";
import { promises as fs } from "node:fs";
import { scrubSentryEvent } from "@/lib/sentry-scrubbing";
import type { Event } from "@sentry/nextjs";

describe("Sentry event privacy scrubber", () => {
  test("removes user PII, cookies, sensitive headers, query values, and raw emails", () => {
    const event: Event = {
      event_id: "event-1",
      message: "Failed checkout for buyer@example.com",
      transaction: "POST /checkout?token=raw-token&email=buyer@example.com",
      user: {
        id: "user-1",
        email: "buyer@example.com",
        username: "Buyer Example",
        ip_address: "203.0.113.10",
      },
      request: {
        url: "https://stayprimeph.com/login?email=buyer@example.com&token=raw-token",
        query_string: "email=buyer@example.com&token=raw-token",
        cookies: { session: "raw-session" },
        headers: {
          authorization: "Bearer raw-token",
          cookie: "session=raw-session",
          "x-request-id": "request-1",
        },
        data: {
          password: "CorrectHorseBatteryStaple!",
          billingEmail: "buyer@example.com",
          phone: "+639171234567",
        },
      },
      breadcrumbs: [
        {
          message: "Submitting form for buyer@example.com",
          data: {
            token: "raw-token",
            redirect: "https://stayprimeph.com/reset-password?token=raw-token",
          },
        },
      ],
      exception: {
        values: [
          {
            type: "Error",
            value: "Provider rejected buyer@example.com with token raw-token",
          },
        ],
      },
    };

    const scrubbed = scrubSentryEvent(event);
    const payload = JSON.stringify(scrubbed);

    expect(payload).not.toContain("buyer@example.com");
    expect(payload).not.toContain("raw-token");
    expect(payload).not.toContain("raw-session");
    expect(payload).not.toContain("+639171234567");
    expect(scrubbed?.user).toEqual({ id: "user-1" });
    expect(scrubbed?.request?.cookies).toBeUndefined();
    expect(scrubbed?.request?.headers?.["x-request-id"]).toBe("request-1");
    expect(payload).toContain("b***r@example.com");
    expect(payload).toContain("[redacted]");
  });

  test("keeps Sentry enabled through server, edge, and browser configs", async () => {
    const [serverConfig, edgeConfig, clientConfig, instrumentation] = await Promise.all([
      fs.readFile("sentry.server.config.ts", "utf8"),
      fs.readFile("sentry.edge.config.ts", "utf8"),
      fs.readFile("sentry.client.config.ts", "utf8"),
      fs.readFile("instrumentation.ts", "utf8"),
    ]);

    expect(serverConfig).toContain("dsn: process.env.SENTRY_DSN");
    expect(edgeConfig).toContain("dsn: process.env.SENTRY_DSN");
    expect(clientConfig).toContain("dsn: process.env.NEXT_PUBLIC_SENTRY_DSN");
    expect(serverConfig).toContain("enabled: Boolean(process.env.SENTRY_DSN)");
    expect(edgeConfig).toContain("enabled: Boolean(process.env.SENTRY_DSN)");
    expect(clientConfig).toContain("enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)");
    expect(serverConfig).toContain("...sentryPrivacyOptions");
    expect(edgeConfig).toContain("...sentryPrivacyOptions");
    expect(clientConfig).toContain("...sentryPrivacyOptions");
    expect(instrumentation).toContain('void import("./sentry.server.config")');
    expect(instrumentation).toContain('void import("./sentry.edge.config")');
  });
});
