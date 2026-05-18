import type { ChatSession } from "../model/entities/ChatSession";

export interface ChatHistoryViewModel {
  sessions: ChatSession[];
  filteredSessions: ChatSession[];
  selectedSession: ChatSession | undefined;
  loading: boolean;
  error: string | null;
  query: string;
  selectedId: string;
  loadSessions(): Promise<{ success: boolean; errorMessage?: string }>;
  setQuery(value: string): void;
  selectSession(sessionId: string): void;
}
