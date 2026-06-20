import { randomBytes } from "node:crypto";
import "@testing-library/jest-dom/vitest";

// Provide non-secret test defaults at runtime instead of committing them.
// AUTH_SECRET is generated per run so no credential-looking literal lives in source.
process.env.AUTH_SECRET ??= randomBytes(24).toString("hex");
process.env.DATABASE_URL ??=
  "postgresql://stayprimeph:stayprimeph@localhost:5432/stayprimeph_test?schema=public";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.PERSISTENCE_DRIVER ??= "json";
