import { useMemo, useState } from "react";
import { Bot, Clock, Mail, MessageSquare, Search, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
};

type ChatUser = {
  id: string;
  name: string;
  email: string;
  status: "active" | "idle" | "offline";
  lastSeen: string;
  lastMessage: string;
  messages: ChatMessage[];
};

const USERS: ChatUser[] = [
  {
    id: "u-1",
    name: "Sarah Mitchell",
    email: "sarah.mitchell@example.com",
    status: "active",
    lastSeen: "2 min ago",
    lastMessage: "Can you summarize the onboarding policy?",
    messages: [
      {
        id: "m-1",
        role: "user",
        content: "Can you summarize the onboarding policy?",
        time: "9:41 AM",
      },
      {
        id: "m-2",
        role: "assistant",
        content:
          "The onboarding policy covers account setup, role-based access, document review, and the first-week checklist. New employees should complete security training before receiving production access.",
        time: "9:42 AM",
      },
      {
        id: "m-3",
        role: "user",
        content: "What should managers verify before day one?",
        time: "9:44 AM",
      },
      {
        id: "m-4",
        role: "assistant",
        content:
          "Managers should verify the employee profile, equipment request, workspace assignment, and required access approvals before the start date.",
        time: "9:45 AM",
      },
    ],
  },
  {
    id: "u-2",
    name: "Michael Carter",
    email: "michael.carter@example.com",
    status: "idle",
    lastSeen: "18 min ago",
    lastMessage: "Where is the refund policy mentioned?",
    messages: [
      {
        id: "m-5",
        role: "user",
        content: "Where is the refund policy mentioned?",
        time: "8:58 AM",
      },
      {
        id: "m-6",
        role: "assistant",
        content:
          "The refund policy appears in the customer support handbook. It explains eligibility windows, approval requirements, and escalation steps for exceptions.",
        time: "8:59 AM",
      },
    ],
  },
  {
    id: "u-3",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@example.com",
    status: "offline",
    lastSeen: "Yesterday",
    lastMessage: "Show me the implementation steps.",
    messages: [
      {
        id: "m-7",
        role: "user",
        content: "Show me the implementation steps.",
        time: "Yesterday",
      },
      {
        id: "m-8",
        role: "assistant",
        content:
          "The implementation plan has three phases: preparation, rollout, and validation. Each phase includes owners, review checkpoints, and acceptance criteria.",
        time: "Yesterday",
      },
      {
        id: "m-9",
        role: "user",
        content: "Which phase has the highest risk?",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "u-4",
    name: "Daniel Brooks",
    email: "daniel.brooks@example.com",
    status: "active",
    lastSeen: "Now",
    lastMessage: "Does the image catalog include office layouts?",
    messages: [
      {
        id: "m-10",
        role: "user",
        content: "Does the image catalog include office layouts?",
        time: "10:12 AM",
      },
      {
        id: "m-11",
        role: "assistant",
        content:
          "Yes. The image catalog includes several office layout references with titles, descriptions, and storage links for visual review.",
        time: "10:13 AM",
      },
    ],
  },
];

const statusClass: Record<ChatUser["status"], string> = {
  active: "bg-emerald-500",
  idle: "bg-amber-500",
  offline: "bg-gray-300",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ChatHistoryPage() {
  const [selectedId, setSelectedId] = useState(USERS[0]?.id ?? "");
  const [query, setQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return USERS;
    return USERS.filter(
      (user) =>
        user.name.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized) ||
        user.lastMessage.toLowerCase().includes(normalized),
    );
  }, [query]);

  const selectedUser = USERS.find((user) => user.id === selectedId) ?? filteredUsers[0] ?? USERS[0];

  return (
    <div className="flex h-full flex-col bg-rm-trip-surface">
      <div className="border-b border-gray-100 bg-white px-4 py-5 shadow-rm-trip-card sm:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text">Chat History</h1>
            <p className="mt-1 text-sm font-medium text-rm-trip-text-muted">
              Review user conversations across the admin workspace.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-rm-trip-pill border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-rm-trip-brand">
            <MessageSquare className="h-3.5 w-3.5" />
            {USERS.length} users
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[360px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-gray-100 bg-white lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rm-trip-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users or messages"
                className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedId(user.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-rm-trip-smooth px-3 py-3 text-left transition-all",
                  selectedUser?.id === user.id
                    ? "bg-rm-trip-brand text-white shadow-rm-trip-card"
                    : "text-rm-trip-text hover:bg-gray-50",
                )}
              >
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-rm-trip-smooth text-sm font-bold",
                      selectedUser?.id === user.id ? "bg-white/15 text-white" : "bg-blue-50 text-rm-trip-brand",
                    )}
                  >
                    {initials(user.name)}
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2",
                      selectedUser?.id === user.id ? "border-rm-trip-brand" : "border-white",
                      statusClass[user.status],
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold">{user.name}</p>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-semibold",
                        selectedUser?.id === user.id ? "text-white/75" : "text-rm-trip-text-muted",
                      )}
                    >
                      {user.lastSeen}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 truncate text-xs font-medium",
                      selectedUser?.id === user.id ? "text-white/80" : "text-rm-trip-text-muted",
                    )}
                  >
                    {user.lastMessage}
                  </p>
                </div>
              </button>
            ))}

            {filteredUsers.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-semibold text-rm-trip-text">No users found</p>
                <p className="mt-1 text-xs text-rm-trip-text-muted">Try searching a different name or message.</p>
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-rm-trip-surface">
          {selectedUser ? (
            <>
              <div className="border-b border-gray-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand text-sm font-bold text-white shadow-rm-trip-glow">
                        {initials(selectedUser.name)}
                      </div>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
                          statusClass[selectedUser.status],
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-rm-trip-heading text-lg font-bold text-rm-trip-text">
                        {selectedUser.name}
                      </h2>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-rm-trip-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {selectedUser.email}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {selectedUser.lastSeen}
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
                  {selectedUser.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex items-end gap-3", message.role === "user" && "flex-row-reverse")}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-rm-trip-smooth border shadow-sm",
                          message.role === "user"
                            ? "border-rm-trip-brand bg-rm-trip-brand text-white"
                            : "border-gray-100 bg-white text-rm-trip-text-muted",
                        )}
                      >
                        {message.role === "user" ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
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
                        <span className="px-1 text-[11px] font-medium text-rm-trip-text-muted">{message.time}</span>
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
                <p className="mt-3 font-semibold text-rm-trip-text">Select a user</p>
                <p className="mt-1 text-sm text-rm-trip-text-muted">Choose a user from the list to view chat history.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
