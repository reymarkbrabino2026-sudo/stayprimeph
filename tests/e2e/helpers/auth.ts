import { expect, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const usersPath = path.join(dataDir, "users.json");
const tokensPath = path.join(dataDir, "auth-tokens.json");
const sessionsPath = path.join(dataDir, "sessions.json");

type StoredUser = {
  id: string;
  email: string;
  emailVerifiedAt?: string;
};

type StoredToken = {
  userId: string;
};

type StoredSession = {
  userId: string;
};

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeJsonArray<T>(filePath: string, records: T[]) {
  await writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`);
}

export async function expectNoSignedInSession(page: Page) {
  const session = await page.request.get("/api/session");
  await expect(session).toBeOK();
  const data = (await session.json()) as { user: unknown | null };
  expect(data.user).toBeNull();
}

export async function markUserEmailVerified(email: string) {
  const users = await readJsonArray<StoredUser>(usersPath);
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((item) => item.email.toLowerCase() === normalizedEmail);
  expect(user, `Expected E2E user ${email} to exist before verification`).toBeTruthy();

  await writeJsonArray(usersPath, users.map((item) => (
    item.id === user!.id ? { ...item, emailVerifiedAt: new Date().toISOString() } : item
  )));
}

export async function cleanupUserByEmail(email: string) {
  const users = await readJsonArray<StoredUser>(usersPath);
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((item) => item.email.toLowerCase() === normalizedEmail);
  if (!user) return;

  await writeJsonArray(usersPath, users.filter((item) => item.id !== user.id));

  const tokens = await readJsonArray<StoredToken>(tokensPath);
  await writeJsonArray(tokensPath, tokens.filter((item) => item.userId !== user.id));

  const sessions = await readJsonArray<StoredSession>(sessionsPath);
  await writeJsonArray(sessionsPath, sessions.filter((item) => item.userId !== user.id));
}

