import type { ChatSession } from "../../model/entities/ChatSession";
import { ChatHistoryConversationHeader } from "./ChatHistoryConversationHeader";
import { ChatHistoryEmptySelection } from "./ChatHistoryEmptySelection";
import { ChatHistoryMessageList } from "./ChatHistoryMessageList";

interface ChatHistoryConversationProps {
  selectedSession: ChatSession | undefined;
  onBack: () => void;
}

export function ChatHistoryConversation({ selectedSession, onBack }: ChatHistoryConversationProps) {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col bg-rm-trip-surface">
      {selectedSession ? (
        <>
          <ChatHistoryConversationHeader session={selectedSession} onBack={onBack} />
          <ChatHistoryMessageList messages={selectedSession.messages} />
        </>
      ) : (
        <ChatHistoryEmptySelection />
      )}
    </section>
  );
}
