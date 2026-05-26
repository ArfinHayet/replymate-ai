import { useEffect, useMemo, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { createChatService } from "../../model/services/createChatService";
import { AxiosError } from "axios";

export function ChatSuggestionsPage() {
  const chatService = useMemo(() => createChatService(), []);
  const [draft, setDraft] = useState(["", "", ""]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    chatService
      .getSuggestions()
      .then((suggestions) => {
        if (cancelled) return;
        setDraft([suggestions[0] ?? "", suggestions[1] ?? "", suggestions[2] ?? ""]);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load chat suggestions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chatService]);

  const updateDraft = (index: number, value: string) => {
    setDraft((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const saveSuggestions = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const saved = await chatService.updateSuggestions(
        draft.map((suggestion) => suggestion.trim()).filter(Boolean),
      );
      setDraft([saved[0] ?? "", saved[1] ?? "", saved[2] ?? ""]);
      toast.success("Chat suggestions saved");
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as { message?: string } | undefined)?.message ?? undefined)
          : undefined;
      toast.error(message ?? "Could not save chat suggestions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader
        title="Chat Suggestions"
        subtitle="Create up to three suggested prompts for the dashboard chat and website widget."
      />
      <PageContent>
        <section className="overflow-hidden rounded-rm-trip-smooth border border-gray-100 bg-white">
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand/10">
              <Sparkles className="h-4 w-4 text-rm-trip-brand" />
            </div>
            <div className="min-w-0">
              <h2 className="font-rm-trip-heading text-base font-semibold text-rm-trip-text">
                Suggested prompts
              </h2>
              <p className="text-sm text-rm-trip-text-muted">
                These appear before a visitor starts a conversation.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="grid gap-3 md:grid-cols-3">
              {draft.map((suggestion, index) => (
                <label key={index} className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-rm-trip-text-muted">
                    Suggestion {index + 1}
                  </span>
                  <input
                    value={suggestion}
                    maxLength={120}
                    disabled={loading || saving}
                    onChange={(event) => updateDraft(index, event.target.value)}
                    placeholder="Example: What services do you offer?"
                    className="h-11 w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-3 text-sm text-rm-trip-text outline-none transition-all focus-rm-trip-highlight disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-rm-trip-text-muted">
                Empty fields are ignored. Each suggestion can be up to 120 characters.
              </p>
              <button
                type="button"
                onClick={() => void saveSuggestions()}
                disabled={loading || saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-4 text-sm font-semibold text-white shadow-rm-trip-card transition-all hover:bg-rm-trip-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </section>
      </PageContent>
    </div>
  );
}

export default ChatSuggestionsPage;
