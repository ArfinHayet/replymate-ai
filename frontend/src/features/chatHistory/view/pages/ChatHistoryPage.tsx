import { MessageSquare } from "lucide-react";
import { useChatHistoryViewModel } from "../../viewModel/useChatHistoryViewModel";
import { ChatHistoryConversation } from "../components/ChatHistoryConversation";
import { ChatHistorySidebar } from "../components/ChatHistorySidebar";
import { PageHeader } from "@/components/layout/PageHeader";

export function ChatHistoryPage() {
  const viewModel = useChatHistoryViewModel();

  return (
    <div className="flex h-full flex-col bg-rm-trip-surface">
      <PageHeader title="Chat History" subtitle="Review user conversations.">
        <div className="inline-flex items-center gap-2 rounded-rm-trip-pill border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-rm-trip-brand">
          <MessageSquare className="h-3.5 w-3.5" />
          {viewModel.sessions.length} sessions
        </div>
      </PageHeader>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[360px_1fr]">
        <ChatHistorySidebar
          sessions={viewModel.filteredSessions}
          selectedSession={viewModel.selectedSession}
          loading={viewModel.loading}
          error={viewModel.error}
          query={viewModel.query}
          onQueryChange={viewModel.setQuery}
          onSelectSession={viewModel.selectSession}
          onRetry={() => void viewModel.loadSessions()}
        />
        <ChatHistoryConversation selectedSession={viewModel.selectedSession} />
      </div>
    </div>
  );
}
