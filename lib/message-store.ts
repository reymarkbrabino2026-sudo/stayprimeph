import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { Message } from "@/lib/types";

const storeFileName = "messages.json";

export async function readStoredMessages(): Promise<Message[]> {
  return readJsonStore<Message>(storeFileName);
}

export async function writeStoredMessages(messages: Message[]) {
  await writeJsonStore(storeFileName, messages);
}
