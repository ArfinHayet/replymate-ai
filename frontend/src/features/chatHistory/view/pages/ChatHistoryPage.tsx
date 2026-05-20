import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useChatHistoryViewModel } from "../../viewModel/useChatHistoryViewModel";
import { ChatHistoryConversation } from "../components/ChatHistoryConversation";
import { ChatHistorySidebar } from "../components/ChatHistorySidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

export function ChatHistoryPage() {
  const viewModel = useChatHistoryViewModel();
  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");

  const hasSelectedSession = Boolean(viewModel.selectedSession);
  const isMobileConversationView = mobileView === "conversation" && hasSelectedSession;

  const handleSelectSession = (sessionId: string) => {
    viewModel.selectSession(sessionId);
    setMobileView("conversation");
  };

  return (
    <div className="flex h-full flex-col bg-rm-trip-surface">
      <PageHeader title="Chat History" subtitle="Review user conversations.">
        {!isMobileConversationView && (
          <div className="inline-flex items-center gap-2 rounded-rm-trip-pill border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-rm-trip-brand">
            <MessageSquare className="h-3.5 w-3.5" />
            {viewModel.sessions.length} sessions
          </div>
        )}
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[360px_1fr]">
        <div className={cn("min-h-0 flex-1", isMobileConversationView ? "hidden lg:block" : "block")}>
          <ChatHistorySidebar
            sessions={viewModel.filteredSessions}
            selectedSession={viewModel.selectedSession}
            loading={viewModel.loading}
            error={viewModel.error}
            query={viewModel.query}
            onQueryChange={viewModel.setQuery}
            onSelectSession={handleSelectSession}
            onRetry={() => void viewModel.loadSessions()}
          />
        </div>
        <div className={cn("min-h-0 flex-1 lg:flex", isMobileConversationView ? "block" : "hidden lg:block")}>
          <ChatHistoryConversation
            selectedSession={viewModel.selectedSession}
            onBack={() => setMobileView("list")}
          />
        </div>
      </div>
    </div>
  );
}
