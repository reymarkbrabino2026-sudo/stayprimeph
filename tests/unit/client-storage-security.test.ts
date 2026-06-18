import { describe, expect, test } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isSensitiveClientStorageKey } from "@/lib/use-local-storage-state";

const repoRoot = process.cwd();
const sourceRoots = ["app", "components", "lib"];
const allowedLocalStorageKeys = new Set([
  "stayprimeph-host-wizard",
  "stayprimeph-wishlist-property-ids",
  "stayprimeph-pending-wishlist-property-ids",
]);

async function readSourceFiles(dir: string): Promise<Array<{ file: string; text: string }>> {
  const entries = await fs.readdir(path.join(repoRoot, dir), { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return readSourceFiles(file);
    if (!/\.(ts|tsx|mts|mjs)$/.test(entry.name)) return [];
    return [{ file, text: await fs.readFile(path.join(repoRoot, file), "utf8") }];
  }));

  return files.flat();
}

function literalLocalStorageKeys(text: string) {
  return [...text.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*["']([^"']+)["']/g)]
    .map((match) => match[1]);
}

describe("client storage security", () => {
  test("classifies auth and session storage keys as sensitive", () => {
    expect(isSensitiveClientStorageKey("stayprimeph_session")).toBe(true);
    expect(isSensitiveClientStorageKey("auth-token")).toBe(true);
    expect(isSensitiveClientStorageKey("jwt")).toBe(true);
    expect(isSensitiveClientStorageKey("stayprimeph-host-wizard")).toBe(false);
    expect(isSensitiveClientStorageKey("stayprimeph-wishlist-property-ids")).toBe(false);
  });

  test("does not use localStorage for auth or session token keys", async () => {
    const files = (await Promise.all(sourceRoots.map(readSourceFiles))).flat();
    const offenders = files.flatMap(({ file, text }) =>
      literalLocalStorageKeys(text)
        .filter((key) => isSensitiveClientStorageKey(key) || !allowedLocalStorageKeys.has(key))
        .map((key) => `${file}: ${key}`),
    );

    expect(offenders).toEqual([]);
  });
});
