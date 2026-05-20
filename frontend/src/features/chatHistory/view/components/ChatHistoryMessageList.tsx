import { UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ChatHistoryMessage } from "../../model/entities/ChatSession";

interface ChatHistoryMessageListProps {
  messages: ChatHistoryMessage[];
}

export function ChatHistoryMessageList({ messages }: ChatHistoryMessageListProps) {
  const orderedMessages = [...messages].sort((a, b) => {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    if (a.role === "user" && b.role === "assistant") return -1;
    if (a.role === "assistant" && b.role === "user") return 1;
    return 0;
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto [overscroll-behavior-y:contain] [-webkit-overflow-scrolling:touch]">
      <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-5">
        {orderedMessages.map((message) => (
          <div key={message.id} className={cn("flex items-end gap-2.5 sm:gap-3", message.role === "user" && "flex-row-reverse")}>
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-rm-trip-smooth border shadow-sm sm:h-9 sm:w-9",
                message.role === "user"
                  ? "border-rm-trip-brand bg-rm-trip-brand text-white"
                  : "border-gray-100 bg-white",
              )}
            >
              {message.role === "user" ? (
                <UserRound className="h-4 w-4" />
              ) : (
                <img src="/favicon.svg" alt="AI" style={{ width: 16, height: 16 }} />
              )}
            </div>

            <div className={cn("flex max-w-[88%] flex-col gap-1 sm:max-w-[72%]", message.role === "user" && "items-end")}>
              <div
                className={cn(
                  "rounded-rm-trip-smooth px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm sm:px-4 sm:py-3 sm:text-sm",
                  message.role === "user"
                    ? "bg-rm-trip-brand text-white"
                    : "border border-gray-100 bg-white text-rm-trip-text",
                )}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-a:text-rm-trip-brand">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              <span className="px-1 text-[11px] font-medium text-rm-trip-text-muted">
                {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
