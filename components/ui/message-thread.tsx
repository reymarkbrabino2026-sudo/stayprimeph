import type { Message } from "@/lib/types";

export function MessageThread({ messages, currentUserId }: { messages: Message[]; currentUserId?: string }) {
  return (
    <div className="space-y-3 rounded-[1.5rem] bg-white p-4 soft-card sm:p-5">
      {messages.map((message, index) => {
        const isCurrentUser = currentUserId ? message.senderId === currentUserId : index % 2 !== 0;
        return (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-2xl p-4 text-sm sm:max-w-md ${isCurrentUser ? "ml-auto bg-[#21170f] text-white" : "bg-[#fbf7f2]"}`}
          >
            {message.message}
          </div>
        );
      })}
    </div>
  );
}
