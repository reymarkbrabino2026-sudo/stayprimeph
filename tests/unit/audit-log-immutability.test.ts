import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("audit log immutability migration", () => {
  it("blocks updates and deletes for compliance-critical audit records", () => {
    const migration = readFileSync(
      join(process.cwd(), "prisma/migrations/20260618175000_immutable_listing_audit_logs/migration.sql"),
      "utf8",
    );

    expect(migration).toContain("prevent_immutable_audit_log_mutation");
    expect(migration).toContain("BEFORE UPDATE OR DELETE ON \"AuditLog\"");
    expect(migration).toContain("'listing.approved'");
    expect(migration).toContain("'listing.rejected'");
    expect(migration).toContain("'payment.approved'");
    expect(migration).toContain("'payment.rejected'");
    expect(migration).toContain("'payment.refunded'");
    expect(migration).toContain("'account.anonymized'");
    expect(migration).toContain("RAISE EXCEPTION 'Compliance-critical audit logs are immutable'");
  });
});
