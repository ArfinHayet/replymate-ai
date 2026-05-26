import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  createChatErrorMessage,
  createUserMessage,
  mapChatResponseToAssistantMessage,
} from "../model/mappers/chatMapper";
import { createChatService } from "../model/services/createChatService";
import type { ChatMessage } from "../model/entities/ChatMessage";
import type { ChatViewModel } from "./ChatViewModel";
import { AxiosError } from "axios";

export function useChatViewModel(): ChatViewModel {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsDraft, setSuggestionsDraft] = useState<string[]>(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsSaving, setSuggestionsSaving] = useState(false);
  const sessionId = useRef(crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatService = useMemo(() => createChatService(), []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    let cancelled = false;

    chatService
      .getSuggestions()
      .then((loadedSuggestions) => {
        if (cancelled) return;
        setSuggestions(loadedSuggestions);
        setSuggestionsDraft([
          loadedSuggestions[0] ?? "",
          loadedSuggestions[1] ?? "",
          loadedSuggestions[2] ?? "",
        ]);
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
          setSuggestionsDraft(["", "", ""]);
        }
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chatService]);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const resizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    resetTextareaHeight();
    setMessages((prev) => [...prev, createUserMessage(text)]);
    setLoading(true);

    try {
      const response = await chatService.sendMessage(text, sessionId.current);
      if (response.usage) {
        window.dispatchEvent(new CustomEvent("supportmate-usage-updated", { detail: response.usage }));
      }
      setMessages((prev) => [...prev, mapChatResponseToAssistantMessage(response)]);
      const redirectAction = response.action?.type === "redirect" ? response.action : null;
      if (redirectAction) {
        window.setTimeout(() => {
          const opened = window.open(redirectAction.url, "_blank", "noopener");
          if (!opened) {
            setMessages((prev) => [
              ...prev,
              mapChatResponseToAssistantMessage({
                answer: `[Open page](${redirectAction.url})`,
                cached: false,
              }),
            ]);
          }
        }, redirectAction.delayMs);
      }
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as { message?: string } | undefined)?.message ?? undefined)
          : undefined;
      setMessages((prev) => [...prev, createChatErrorMessage(message)]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    resizeTextarea(event.target);
  };

  const setSuggestedQuestion = (question: string) => {
    setInput(question);
    textareaRef.current?.focus();
  };

  const updateSuggestionDraft = (index: number, value: string) => {
    setSuggestionsDraft((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const saveSuggestions = async () => {
    if (suggestionsSaving) return {};

    setSuggestionsSaving(true);
    try {
      const saved = await chatService.updateSuggestions(
        suggestionsDraft.map((suggestion) => suggestion.trim()).filter(Boolean),
      );
      setSuggestions(saved);
      setSuggestionsDraft([saved[0] ?? "", saved[1] ?? "", saved[2] ?? ""]);
      return { message: "Chat suggestions saved" };
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as { message?: string } | undefined)?.message ?? undefined)
          : undefined;
      return { errorMessage: message ?? "Could not save chat suggestions" };
    } finally {
      setSuggestionsSaving(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    sessionId.current = crypto.randomUUID();
  };

  return {
    messages,
    input,
    suggestions,
    suggestionsDraft,
    loading,
    suggestionsLoading,
    suggestionsSaving,
    bottomRef,
    textareaRef,
    canSend: Boolean(input.trim()) && !loading,
    updateSuggestionDraft,
    saveSuggestions,
    setSuggestedQuestion,
    handleInputChange,
    handleKeyDown,
    send,
    clearChat,
  };
}
