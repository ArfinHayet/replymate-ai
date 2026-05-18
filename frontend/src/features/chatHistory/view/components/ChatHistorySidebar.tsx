import { Search } from "lucide-react";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/utils";
import type { ChatSession } from "../../model/entities/ChatSession";
import { formatRelativeTime, shortSessionId } from "../../model/services/chatHistoryFormatters";

interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  selectedSession: ChatSession | undefined;
  loading: boolean;
  error: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  onSelectSession: (sessionId: string) => void;
  onRetry: () => void;
}

export function ChatHistorySidebar({
  sessions,
  selectedSession,
  loading,
  error,
  query,
  onQueryChange,
  onSelectSession,
  onRetry,
}: ChatHistorySidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col border-b border-gray-100 bg-white lg:border-b-0 lg:border-r">
      <div className="border-b border-gray-100 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rm-trip-text-muted" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search sessions or messages"
            className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-rm-trip-text-muted">Loading sessions...</p>
          </div>
        )}
        {error && (
          <div className="px-2 py-4">
            <InlineError
              title="Could not load chat history"
              message={error}
              onRetry={onRetry}
              retrying={loading}
            />
          </div>
        )}
        {!loading &&
          !error &&
          sessions.map((session) => {
            const isSelected = selectedSession?.sessionId === session.sessionId;
            return (
              <button
                key={session.sessionId}
                onClick={() => onSelectSession(session.sessionId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-rm-trip-smooth px-3 py-3 text-left transition-all",
                  isSelected ? "bg-rm-trip-brand text-white shadow-rm-trip-card" : "text-rm-trip-text hover:bg-gray-50",
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-rm-trip-smooth text-sm font-bold",
                    isSelected ? "bg-white/15 text-white" : "bg-blue-50 text-rm-trip-brand",
                  )}
                >
                  #
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold">Session {shortSessionId(session.sessionId)}</p>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-semibold",
                        isSelected ? "text-white/75" : "text-rm-trip-text-muted",
                      )}
                    >
                      {formatRelativeTime(session.lastMessageAt)}
                    </span>
                  </div>
                  <p className={cn("mt-1 truncate text-xs font-medium", isSelected ? "text-white/80" : "text-rm-trip-text-muted")}>
                    {session.lastMessage}
                  </p>
                </div>
              </button>
            );
          })}
        {!loading && !error && sessions.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-rm-trip-text">No sessions found</p>
            <p className="mt-1 text-xs text-rm-trip-text-muted">No chat history yet, or nothing matches your search.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
