import { promises as fs } from "node:fs";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { jsonStorePath } from "@/lib/json-store-path";

const blobPrefix = "json";

function hasBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function blobPath(fileName: string) {
  return `${blobPrefix}/${fileName}`;
}

async function readFileStore<T>(fileName: string): Promise<T[]> {
  const storePath = jsonStorePath(fileName);
  try {
    const raw = await fs.readFile(storePath, "utf8");
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function readBundledStore<T>(fileName: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", fileName), "utf8");
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function writeFileStore<T>(fileName: string, items: T[]) {
  const storePath = jsonStorePath(fileName);
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(items, null, 2), "utf8");
}

export async function readJsonStore<T>(fileName: string): Promise<T[]> {
  if (!hasBlobStore()) return readFileStore<T>(fileName);

  const blob = await get(blobPath(fileName), { access: "private", useCache: false });
  if (blob?.statusCode === 200 && blob.stream) {
    const raw = await new Response(blob.stream).text();
    return JSON.parse(raw) as T[];
  }

  const seeded = await readBundledStore<T>(fileName);
  await writeJsonStore(fileName, seeded);
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
}
