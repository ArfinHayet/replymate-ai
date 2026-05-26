import { useChatViewModel } from "../../viewModel/useChatViewModel";
import { ChatInputBar } from "../components/ChatInputBar";
import { ChatMessageList } from "../components/ChatMessageList";
import { ChatStyles } from "../components/ChatStyles";
import { PageHeader } from "@/components/layout/PageHeader";
import { Trash2 } from "lucide-react";

export function ChatPage() {
  const viewModel = useChatViewModel();

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--chat-bg, #F7F8FC)" }}>
      <ChatStyles />
      <PageHeader title="Chat" subtitle="Ask questions using your approved business content.">
        <div className="flex items-center gap-2">
          <span className="status-dot">Online</span>
          {viewModel.messages.length > 0 && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-rm-trip-smooth border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-rm-trip-text-muted transition-all hover:border-gray-300 hover:text-rm-trip-state-error hover:bg-red-50"
              onClick={viewModel.clearChat}
            >
              <Trash2 size={13} />
              New chat
            </button>
          )}
        </div>
      </PageHeader>
      <ChatMessageList
        messages={viewModel.messages}
        loading={viewModel.loading}
        suggestions={viewModel.suggestions}
        bottomRef={viewModel.bottomRef}
        onSelectSuggestion={viewModel.setSuggestedQuestion}
      />
      <ChatInputBar
        input={viewModel.input}
        loading={viewModel.loading}
        canSend={viewModel.canSend}
        textareaRef={viewModel.textareaRef}
        handleInputChange={viewModel.handleInputChange}
        handleKeyDown={viewModel.handleKeyDown}
        send={viewModel.send}
      />
    </div>
  );
}
