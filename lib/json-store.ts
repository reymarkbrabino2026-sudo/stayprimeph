import { promises as fs } from "node:fs";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { jsonStorePath } from "@/lib/json-store-path";

const blobPrefix = "json";
const blobCacheMs = 15_000;

type CacheEntry<T> = {
  items: T[];
  mtimeMs?: number;
  expiresAt?: number;
};

const readCache = new Map<string, CacheEntry<unknown>>();

function hasBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function blobPath(fileName: string) {
  return `${blobPrefix}/${fileName}`;
}

async function readFileStore<T>(fileName: string): Promise<T[]> {
  const storePath = jsonStorePath(fileName);
  try {
    const stats = await fs.stat(storePath);
    const cached = readCache.get(fileName) as CacheEntry<T> | undefined;
    if (cached?.mtimeMs === stats.mtimeMs) return cached.items;

    const raw = await fs.readFile(storePath, "utf8");
    const items = parseJsonArray<T>(raw);
    readCache.set(fileName, { items, mtimeMs: stats.mtimeMs });
    return items;
  } catch {
    return [];
  }
}

async function readBundledStore<T>(fileName: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", fileName), "utf8");
    return parseJsonArray<T>(raw);
  } catch {
    return [];
  }
}

function parseJsonArray<T>(raw: string): T[] {
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed as T[] : [];
}

async function writeFileStore<T>(fileName: string, items: T[]) {
  const storePath = jsonStorePath(fileName);
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(items, null, 2), "utf8");
  const stats = await fs.stat(storePath);
  readCache.set(fileName, { items, mtimeMs: stats.mtimeMs });
}

export async function readJsonStore<T>(fileName: string): Promise<T[]> {
  if (!hasBlobStore()) return readFileStore<T>(fileName);

  const cached = readCache.get(fileName) as CacheEntry<T> | undefined;
  if (cached?.expiresAt && cached.expiresAt > Date.now()) return cached.items;

  try {
    const blob = await get(blobPath(fileName), { access: "private", useCache: false });
    if (blob?.statusCode === 200 && blob.stream) {
      const raw = await new Response(blob.stream).text();
      const items = parseJsonArray<T>(raw);
      readCache.set(fileName, { items, expiresAt: Date.now() + blobCacheMs });
      return items;
    }
  } catch (error) {
    console.warn(`Failed to read ${fileName} from blob storage. Falling back to bundled data.`, error);
    return readBundledStore<T>(fileName);
  }

  const seeded = await readBundledStore<T>(fileName);
  try {
    await writeJsonStore(fileName, seeded);
  } catch (error) {
    console.warn(`Failed to seed ${fileName} in blob storage. Continuing with bundled data.`, error);
  }
  return seeded;
}

export async function writeJsonStore<T>(fileName: string, items: T[]) {
  if (!hasBlobStore()) {
    await writeFileStore(fileName, items);
    return;
  }

  await put(blobPath(fileName), JSON.stringify(items, null, 2), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  readCache.set(fileName, { items, expiresAt: Date.now() + blobCacheMs });
}
