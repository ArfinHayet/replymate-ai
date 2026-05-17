import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Send, Loader2, User, Zap, Trash2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { sendChat } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";

interface Message {
  role: "user" | "assistant";
  content: string;
  cached?: boolean;
}

const SUGGESTED = ["What is this document about?", "Summarize the key points", "What are the main topics?"];

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await sendChat(text, sessionId.current);
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer, cached: res.cached }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const clearChat = () => {
    setMessages([]);
    sessionId.current = crypto.randomUUID();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Keyframes only — cannot be expressed in Tailwind without config changes */}
      <style>{`
        @keyframes fade-in      { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes msg-in       { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes typing-bounce{ 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-5px); } }
        @keyframes pulse-dot    { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.85); } }
        .anim-fade-in  { animation: fade-in 0.4s ease; }
        .anim-msg-in   { animation: msg-in 0.25s ease; }
        .anim-typing   { animation: typing-bounce 1.2s ease infinite; }
        .anim-pulse-dot{ animation: pulse-dot 2s ease infinite; }
      `}</style>

      {/* ── Header ── */}
      <PageHeader title="Chat" subtitle="Powered by your documents">
        <span className="inline-flex items-center gap-[5px] text-[11px] font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-[2px] rounded-full">
          <span className="w-[5px] h-[5px] rounded-full bg-green-400 anim-pulse-dot" />
          Online
        </span>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-black/[0.13] px-3 py-1.5 rounded-[10px] transition-all duration-150 hover:text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-[0.97]"
          >
            <Trash2 size={13} />
            New chat
          </button>
        )}
      </PageHeader>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 pt-6 pb-4 flex flex-col gap-5 max-w-[760px] mx-auto w-full">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-5 text-center anim-fade-in">
              <div className="w-[72px] h-[72px] rounded-[22px] bg-blue-50 border border-blue-200 flex items-center justify-center mb-5 shadow-[0_0_0_8px_rgba(37,99,235,0.04),0_0_0_16px_rgba(37,99,235,0.02)]">
                <Sparkles size={28} color="#2563EB" strokeWidth={1.5} />
              </div>
              <p className="text-[17px] font-semibold text-slate-900 tracking-[-0.3px] mb-1.5">
                Ask anything about your documents
              </p>
              <p className="text-sm text-slate-500 max-w-[280px] leading-relaxed mb-7">
                I'll find accurate answers from your uploaded documents.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                    className="text-[13px] font-medium text-blue-600 bg-white border border-blue-200 px-4 py-2 rounded-[40px] transition-all duration-150 shadow-sm hover:bg-blue-50 hover:border-blue-600 hover:-translate-y-px hover:shadow-md active:translate-y-0"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn("flex items-end gap-2.5 anim-msg-in", msg.role === "user" && "flex-row-reverse")}
            >
              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 mb-[2px]",
                msg.role === "user"
                  ? "relative overflow-hidden bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.22)]"
                  : "bg-white border border-black/[0.13] text-slate-500 shadow-sm"
              )}>
                {msg.role === "user" ? (
                  <>
                    <User size={15} className="relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
                  </>
                ) : (
                  <img src="/favicon.svg" alt="AI" className="w-4 h-4" />
                )}
              </div>

              {/* Bubble + badge */}
              <div className={cn("flex flex-col gap-1 max-w-[74%]", msg.role === "user" && "items-end")}>
                <div className={cn(
                  "px-[15px] py-[11px] text-sm leading-[1.65] shadow-sm",
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-[20px] rounded-br-[5px] font-[450] whitespace-pre-wrap relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-white/30"
                    : "bg-white text-slate-900 border border-black/[0.07] rounded-[20px] rounded-bl-[5px]"
                )}>
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1.5 [&_ul]:pl-[18px] [&_ol]:my-1.5 [&_ol]:pl-[18px] [&_li]:my-0.5 [&_h1]:mt-2.5 [&_h1]:mb-1 [&_h1]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h2]:font-semibold [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:font-semibold [&_code]:text-[13px] [&_code]:bg-blue-50 [&_code]:text-blue-600 [&_code]:px-[5px] [&_code]:py-[1px] [&_code]:rounded-[5px] [&_pre]:bg-slate-50 [&_pre]:border [&_pre]:border-black/[0.13] [&_pre]:rounded-lg [&_pre]:p-[10px_12px] [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre_code]:bg-transparent [&_pre_code]:text-slate-900 [&_pre_code]:p-0 [&_a]:text-blue-600 [&_a]:underline [&_a]:decoration-blue-200 [&_blockquote]:border-l-[3px] [&_blockquote]:border-blue-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_blockquote]:my-1.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.cached && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.3px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-[3px] rounded-[20px] mt-[2px] w-fit">
                    <Zap size={10} />
                    Cached response
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-end gap-2.5">
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 mb-[2px] bg-white border border-black/[0.13] shadow-sm">
                <img src="/favicon.svg" alt="AI" className="w-4 h-4" />
              </div>
              <div className="bg-white border border-black/[0.07] rounded-[20px] rounded-bl-[5px] px-4 py-3 flex items-center gap-1 shadow-sm">
                <span className="w-[7px] h-[7px] rounded-full bg-blue-600 anim-typing" />
                <span className="w-[7px] h-[7px] rounded-full bg-blue-500/75 anim-typing [animation-delay:0.15s]" />
                <span className="w-[7px] h-[7px] rounded-full bg-blue-500/50 anim-typing [animation-delay:0.3s]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* ── Input area ── */}
      <div className="shrink-0 px-5 pt-4 pb-5 bg-white/[0.95] backdrop-blur-[16px] border-t border-black/[0.07]">
        <div className="max-w-[760px] mx-auto overflow-hidden rounded-[28px] bg-white border border-black/[0.13] shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-[box-shadow,border-color] duration-200 focus-within:border-blue-200 focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.06),0_0_0_3px_rgba(37,99,235,0.1)]">
          <div className="flex items-end py-1 px-1 pl-[18px]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none border-none outline-none bg-transparent text-sm text-slate-900 leading-[1.6] py-2.5 pr-3 min-h-[44px] max-h-[200px] font-[inherit] placeholder:text-slate-400 disabled:opacity-50 focus-visible:outline-none"
              style={{ minHeight: "44px", maxHeight: "200px" }}
            />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="relative overflow-hidden w-9 h-9 shrink-0 mb-[2px] rounded-[14px] bg-blue-600 text-white border-0 flex items-center justify-center shadow-[0_4px_20px_rgba(37,99,235,0.22)] transition-all duration-150 hover:bg-blue-700 hover:scale-[1.05] active:scale-[0.96] disabled:opacity-[0.35] disabled:cursor-not-allowed disabled:shadow-none"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              {loading
                ? <Loader2 size={15} className="animate-spin relative z-10" />
                : <Send size={14} className="relative z-10" />}
            </button>
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-2.5 tracking-[0.1px]">
          <kbd className="font-[inherit] bg-slate-50 border border-black/[0.13] rounded px-[5px] py-[1px] text-[10px] text-slate-500">Enter</kbd>
          {" "}to send{" · "}
          <kbd className="font-[inherit] bg-slate-50 border border-black/[0.13] rounded px-[5px] py-[1px] text-[10px] text-slate-500">Shift + Enter</kbd>
          {" "}for new line
        </p>
      </div>
    </div>
  );
}
