import type { ChatSession } from "../../model/entities/ChatSession";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatHistoryConversationHeader } from "./ChatHistoryConversationHeader";
import { ChatHistoryEmptySelection } from "./ChatHistoryEmptySelection";
import { ChatHistoryMessageList } from "./ChatHistoryMessageList";

interface ChatHistoryConversationProps {
  selectedSession: ChatSession | undefined;
  loading: boolean;
  onBack: () => void;
}

export function ChatHistoryConversation({ selectedSession, loading, onBack }: ChatHistoryConversationProps) {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col bg-rm-trip-surface">
      {selectedSession ? (
        <>
          <ChatHistoryConversationHeader session={selectedSession} onBack={onBack} />
          <ChatHistoryMessageList
            sessionId={selectedSession.sessionId}
            messages={selectedSession.messages}
          />
        </>
      ) : loading ? (
        <div aria-busy="true" className="flex min-h-0 flex-1 items-center px-4 py-8 sm:px-8">
          <div className="mx-auto w-full max-w-4xl space-y-5">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="ml-auto h-16 w-2/3 rounded-rm-trip-smooth" />
            <Skeleton className="h-24 w-3/4 rounded-rm-trip-smooth" />
            <Skeleton className="ml-auto h-20 w-1/2 rounded-rm-trip-smooth" />
          </div>
        </div>
      ) : (
        <ChatHistoryEmptySelection />
      )}
    </section>
  );
}
