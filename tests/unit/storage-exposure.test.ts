import { describe, expect, test } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

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

describe("storage exposure controls", () => {
  test("does not expose Vercel Blob listing APIs from app or lib code", async () => {
    const files = await Promise.all(["app", "lib"].map(readSourceFiles));
    const offenders = files.flat().filter(({ text }) =>
      /import\s*\{[^}]*\blist\b[^}]*\}\s*from\s*["']@vercel\/blob["']/.test(text)
      || /import\s+\*\s+as\s+\w+\s+from\s*["']@vercel\/blob["'][\s\S]*?\.\s*list\s*\(/.test(text),
    );

    expect(offenders.map((item) => item.file)).toEqual([]);
  });

  test("does not expose direct Cloudinary browser upload signatures", async () => {
    const [route, helper] = await Promise.all([
      fs.readFile(path.join(repoRoot, "app/api/uploads/cloudinary-signature/route.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "lib/cloudinary.ts"), "utf8"),
    ]);

    expect(route).toContain("Direct Cloudinary browser uploads are disabled");
    expect(route).not.toContain("api_sign_request");
    expect(route).not.toContain("apiKey");
    expect(helper).not.toContain("api_sign_request");
  });
});
