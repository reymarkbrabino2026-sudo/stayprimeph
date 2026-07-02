import type { Message } from "@/lib/types";

export function MessageThread({ messages, currentUserId }: { messages: Message[]; currentUserId?: string }) {
  return (
    <div className="min-w-0 space-y-3 rounded-[1.25rem] bg-white p-3 soft-card sm:rounded-[1.5rem] sm:p-5">
      {messages.map((message, index) => {
        const isCurrentUser = currentUserId ? message.senderId === currentUserId : index % 2 !== 0;
        return (
          <div
            key={message.id}
            className={`max-w-[88%] break-words whitespace-pre-wrap rounded-2xl p-3 text-sm leading-6 sm:max-w-md sm:p-4 ${isCurrentUser ? "ml-auto bg-[#21170f] text-white" : "bg-[#fbf7f2]"}`}
          >
            {message.message}
          </div>
        );
      })}
    </div>
  );
}
