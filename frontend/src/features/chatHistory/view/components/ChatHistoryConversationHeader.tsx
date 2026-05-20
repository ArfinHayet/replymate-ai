import { ArrowLeft, Clock, MessageSquare } from "lucide-react";
import type { ChatSession } from "../../model/entities/ChatSession";
import { formatRelativeTime, shortSessionId } from "../../model/services/chatHistoryFormatters";

interface ChatHistoryConversationHeaderProps {
  session: ChatSession;
  onBack: () => void;
}

export function ChatHistoryConversationHeader({ session, onBack }: ChatHistoryConversationHeaderProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5 sm:py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to session list"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-rm-trip-text-muted transition-all hover:border-gray-300 hover:text-rm-trip-text active:scale-95 md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand text-sm font-bold text-white shadow-rm-trip-glow">
            #
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-rm-trip-heading text-base font-bold text-rm-trip-text sm:text-lg">
              Session {shortSessionId(session.sessionId)}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-rm-trip-text-muted">
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {session.messageCount} messages
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatRelativeTime(session.lastMessageAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden rounded-rm-trip-pill border border-gray-100 bg-gray-50 px-3 py-1 text-xs font-bold text-rm-trip-text-muted md:block">
          Read only
        </div>
      </div>
    </div>
  );
}
