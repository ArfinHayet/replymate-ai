import { Bot, User, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "../../model/entities/ChatMessage";
import { ChatEmptyState } from "./ChatEmptyState";

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  suggestions: string[];
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onSelectSuggestion: (question: string) => void;
}

export function ChatMessageList({
  messages,
  loading,
  suggestions,
  bottomRef,
  onSelectSuggestion,
}: ChatMessageListProps) {
  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="messages-area chat-page">
        {messages.length === 0 && (
          <ChatEmptyState suggestions={suggestions} onSelectSuggestion={onSelectSuggestion} />
        )}

        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={cn("msg-row", message.role === "user" ? "user" : "")}>
            <div className={cn("avatar", message.role === "user" ? "user" : "bot")}>
              {message.role === "user" ? <User size={15} /> : <Bot size={15} />}
            </div>
            <div className={cn("bubble-wrap", message.role === "user" ? "user" : "")}>
              <div className={cn("bubble", message.role === "user" ? "user" : "bot")}>
                {message.role === "user" ? (
                  message.content
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ children, href }) => (
                          <a href={href} target="_blank" rel="noreferrer">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {message.cached && (
                <div className="cached-badge">
                  <Zap size={10} />
                  Cached response
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg-row">
            <div className="avatar bot">
              <Bot size={15} />
            </div>
            <div className="typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
