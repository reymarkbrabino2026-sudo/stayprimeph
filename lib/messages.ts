import { readStoredMessages, writeStoredMessages } from "@/lib/message-store";
import { enforceDataRetentionOncePerDay } from "@/lib/data-retention";
import { createMessageInDatabase, listMessagesFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
import type { Message } from "@/lib/types";

function byCreatedAt(a: Message, b: Message) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export async function getMessages(): Promise<Message[]> {
  await enforceDataRetentionOncePerDay();
  const messages = usesPrismaPersistence() ? await listMessagesFromDatabase() : await readStoredMessages();
  return messages.toSorted(byCreatedAt);
}

export async function getMessagesForUser(userId: string) {
  const messages = await getMessages();
  return messages.filter((message) => message.senderId === userId || message.receiverId === userId);
}

export async function createMessage(message: Message) {
  if (usesPrismaPersistence()) {
    await createMessageInDatabase(message);
    return;
  }

  const messages = await readStoredMessages();
  await writeStoredMessages([message, ...messages]);
}
