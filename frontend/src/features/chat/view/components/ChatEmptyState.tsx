import { Sparkles } from "lucide-react";

interface ChatEmptyStateProps {
  suggestions: string[];
  onSelectSuggestion: (question: string) => void;
}

export function ChatEmptyState({ suggestions, onSelectSuggestion }: ChatEmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-orb">
        <Sparkles size={28} color="#2563EB" strokeWidth={1.5} />
      </div>
      <div className="empty-title">Ask anything about your business</div>
      <div className="empty-sub">I'll find accurate answers from your website, uploaded documents/ images.</div>
      <div className="suggestions">
        {suggestions.map((question) => (
          <button key={question} className="suggestion-chip" onClick={() => onSelectSuggestion(question)}>
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
