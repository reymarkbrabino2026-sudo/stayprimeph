import type { Message, User } from "@/lib/types";
import { getUsers } from "@/lib/users";

export const supportContact = {
  phoneDisplay: "0956 673 9577",
  phoneHref: "tel:+639566739577",
  email: "support@stayprimeph.com",
  privacyEmail: "privacy@stayprimeph.com",
};

export async function getSupportAdmin() {
  const users = await getUsers();
  return users.find((user) => user.role === "admin") ?? null;
}

export function isSupportMessage(message: Message, adminId: string) {
  return !message.bookingId && !message.propertyId && (message.senderId === adminId || message.receiverId === adminId);
}

export function getSupportMessagesForUser(messages: Message[], userId: string, adminId: string) {
  return messages.filter(
    (message) =>
      isSupportMessage(message, adminId) &&
      (message.senderId === userId || message.receiverId === userId),
  );
}

export type SupportThread = {
  user: User;
  messages: Message[];
  latestMessage: Message;
};

export function buildSupportThreads(messages: Message[], users: User[], adminId: string): SupportThread[] {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const threadMap = new Map<string, Message[]>();

  for (const message of messages) {
    if (!isSupportMessage(message, adminId)) continue;
    const otherUserId = message.senderId === adminId ? message.receiverId : message.senderId;
    const otherUser = usersById.get(otherUserId);
    if (!otherUser || otherUser.role === "admin") continue;
    threadMap.set(otherUserId, [...(threadMap.get(otherUserId) ?? []), message]);
  }

  return Array.from(threadMap.entries())
    .map(([userId, threadMessages]) => {
      const orderedMessages = threadMessages.toSorted(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      return {
        user: usersById.get(userId)!,
        messages: orderedMessages,
        latestMessage: orderedMessages.at(-1)!,
      };
    })
    .filter((thread) => Boolean(thread.latestMessage))
    .sort((a, b) => new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime());
}
