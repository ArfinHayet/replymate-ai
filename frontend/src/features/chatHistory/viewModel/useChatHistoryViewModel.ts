import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatSession } from "../model/entities/ChatSession";
import { createChatHistoryService } from "../model/services/createChatHistoryService";
import type { ChatHistoryViewModel } from "./ChatHistoryViewModel";

export function useChatHistoryViewModel(): ChatHistoryViewModel {
  const chatHistoryService = useMemo(() => createChatHistoryService(), []);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatHistoryService.listSessions();
      setSessions(data);
      if (data.length > 0) setSelectedId((current) => current || data[0].sessionId);
      return { success: true };
    } catch {
      const errorMessage = "Failed to load chat history.";
      setError(errorMessage);
      return { success: false, errorMessage };
    } finally {
      setLoading(false);
    }
  }, [chatHistoryService]);

  useEffect(() => {
    void Promise.resolve().then(loadSessions);
  }, [loadSessions]);

  const filteredSessions = useMemo(
    () => chatHistoryService.filterSessions(sessions, query),
    [chatHistoryService, query, sessions],
  );
  const selectedSession = chatHistoryService.getSelectedSession(sessions, filteredSessions, selectedId);

  return {
    sessions,
    filteredSessions,
    selectedSession,
    loading,
    error,
    query,
    selectedId,
    loadSessions,
    setQuery,
    selectSession: setSelectedId,
  };
}
