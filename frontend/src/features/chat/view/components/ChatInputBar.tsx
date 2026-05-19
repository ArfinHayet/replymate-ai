import { Loader2, Send } from "lucide-react";
import type { ChatViewModel } from "../../viewModel/ChatViewModel";

type ChatInputBarProps = Pick<
  ChatViewModel,
  "input" | "loading" | "canSend" | "textareaRef" | "handleInputChange" | "handleKeyDown" | "send"
>;

export function ChatInputBar({
  input,
  loading,
  canSend,
  textareaRef,
  handleInputChange,
  handleKeyDown,
  send,
}: ChatInputBarProps) {
  return (
    <div className="input-area chat-page">
      <div className="input-shell">
        <div className="input-row">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question ..."
            rows={1}
            disabled={loading}
            style={{ minHeight: "44px", maxHeight: "200px" }}
          />
          <button className="send-btn" onClick={() => void send()} disabled={!canSend} aria-label="Send message">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
      <div className="input-hint">
        <kbd>Enter</kbd> to send &nbsp;·&nbsp; <kbd>Shift + Enter</kbd> for new line
      </div>
    </div>
  );
}
