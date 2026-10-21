import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatEmptyStateProps {
  suggestions: string[];
  suggestionsLoading: boolean;
  onSelectSuggestion: (question: string) => void;
}

export function ChatEmptyState({ suggestions, suggestionsLoading, onSelectSuggestion }: ChatEmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-orb">
        <Sparkles size={28} className="text-rm-trip-brand" strokeWidth={1.5} />
      </div>
      <div className="empty-title">Ask anything about your business</div>
      <div className="empty-sub">I'll find accurate answers from your approved knowledge and uploaded documents or images.</div>
      <div className="suggestions" aria-busy={suggestionsLoading}>
        {suggestionsLoading
          ? ["w-32", "w-40", "w-36"].map((width) => (
              <Skeleton key={width} className={`h-9 ${width} rounded-full`} />
            ))
          : suggestions.map((question) => (
              <button key={question} className="suggestion-chip" onClick={() => onSelectSuggestion(question)}>
                {question}
              </button>
            ))}
      </div>
    </div>
  );
}
