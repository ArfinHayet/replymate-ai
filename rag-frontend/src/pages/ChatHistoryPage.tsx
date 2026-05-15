import { useEffect, useMemo, useState } from "react";
import { Clock, MessageSquare, Search, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { getChatHistory, type ChatSession } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";

function formatTime(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString();
}

function shortId(sessionId: string) {
  return sessionId.slice(0, 8).toUpperCase();
}

export function ChatHistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getChatHistory()
      .then((data) => {
        setSessions(data);
        if (data.length > 0) setSelectedId(data[0].sessionId);
      })
      .catch(() => setError("Failed to load chat history."))
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sessions;
    return sessions.filter(
      (s) =>
        s.sessionId.toLowerCase().includes(normalized) ||
        s.lastMessage.toLowerCase().includes(normalized),
    );
  }, [query, sessions]);

  const selectedSession = sessions.find((s) => s.sessionId === selectedId) ?? filteredSessions[0];

  return (
    <div className="flex h-full flex-col bg-rm-trip-surface">
      <PageHeader title="Chat History" subtitle="Review user conversations.">
        <div className="inline-flex items-center gap-2 rounded-rm-trip-pill border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-rm-trip-brand">
          <MessageSquare className="h-3.5 w-3.5" />
          {sessions.length} sessions
        </div>
      </PageHeader>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[360px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-gray-100 bg-white lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rm-trip-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-semibold text-red-500">{error}</p>
              </div>
            )}
            {!loading && !error && filteredSessions.map((session) => {
              const isSelected = selectedSession?.sessionId === session.sessionId;
              return (
                <button
                  key={session.sessionId}
                  onClick={() => setSelectedId(session.sessionId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-rm-trip-smooth px-3 py-3 text-left transition-all",
                    isSelected
                      ? "bg-rm-trip-brand text-white shadow-rm-trip-card"
                      : "text-rm-trip-text hover:bg-gray-50",
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
                      <p className="truncate text-sm font-bold">Session {shortId(session.sessionId)}</p>
                      <span className={cn("shrink-0 text-[11px] font-semibold", isSelected ? "text-white/75" : "text-rm-trip-text-muted")}>
                        {formatTime(session.lastMessageAt)}
                      </span>
                    </div>
                    <p className={cn("mt-1 truncate text-xs font-medium", isSelected ? "text-white/80" : "text-rm-trip-text-muted")}>
                      {session.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })}
            {!loading && !error && filteredSessions.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-semibold text-rm-trip-text">No sessions found</p>
                <p className="mt-1 text-xs text-rm-trip-text-muted">No chat history yet, or nothing matches your search.</p>
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-rm-trip-surface">
          {selectedSession ? (
            <>
              <div className="border-b border-gray-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand text-sm font-bold text-white shadow-rm-trip-glow">
                      #
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-rm-trip-heading text-lg font-bold text-rm-trip-text">
                        Session {shortId(selectedSession.sessionId)}
                      </h2>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-rm-trip-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {selectedSession.messageCount} messages
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(selectedSession.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden rounded-rm-trip-pill border border-gray-100 bg-gray-50 px-3 py-1 text-xs font-bold text-rm-trip-text-muted sm:block">
                    Read only
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
                <div className="mx-auto flex max-w-4xl flex-col gap-5">
                  {[...selectedSession.messages]
                    .sort((a, b) => {
                      const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                      if (timeDiff !== 0) return timeDiff;
                      // Tiebreaker for legacy data with identical timestamps: user before assistant
                      if (a.role === "user" && b.role === "assistant") return -1;
                      if (a.role === "assistant" && b.role === "user") return 1;
                      return 0;
                    })
                    .map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex items-end gap-3", message.role === "user" && "flex-row-reverse")}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-rm-trip-smooth border shadow-sm",
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

                      <div
                        className={cn(
                          "flex max-w-[78%] flex-col gap-1 sm:max-w-[68%]",
                          message.role === "user" && "items-end",
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-rm-trip-smooth px-4 py-3 text-sm leading-relaxed shadow-sm",
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
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <MessageSquare className="mx-auto h-10 w-10 text-rm-trip-text-muted" />
                <p className="mt-3 font-semibold text-rm-trip-text">No sessions yet</p>
                <p className="mt-1 text-sm text-rm-trip-text-muted">Chat history will appear here once users start chatting.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
