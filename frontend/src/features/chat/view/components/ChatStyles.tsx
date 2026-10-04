export function ChatStyles() {
  return (
    <style>{`
      .status-dot {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid rgb(var(--color-success-border));
        border-radius: var(--radius-full);
        background: rgb(var(--color-success-surface));
        color: rgb(var(--color-success));
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 600;
      }
      .status-dot::before {
        width: 6px;
        height: 6px;
        border-radius: var(--radius-full);
        background: rgb(var(--color-success));
        content: "";
      }

      .clear-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid rgb(var(--color-border));
        border-radius: var(--radius-control);
        background: rgb(var(--color-surface-muted));
        color: rgb(var(--color-text-muted));
        padding: 7px 11px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
      }
      .clear-btn:hover {
        border-color: rgb(var(--color-error-border));
        background: rgb(var(--color-error-surface));
        color: rgb(var(--color-error));
      }
      .clear-btn:active { transform: translateY(1px); }

      .messages-area {
        display: flex;
        flex-direction: column;
        gap: 18px;
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        padding: 24px 20px 16px;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 72px 20px;
        text-align: center;
        animation: chat-fade-in 220ms ease;
      }
      @keyframes chat-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .empty-orb {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        margin-bottom: 18px;
        border: 1px solid rgb(var(--color-brand-border));
        border-radius: var(--radius-card);
        background: rgb(var(--color-brand-soft));
        color: rgb(var(--color-brand));
      }
      .empty-title {
        margin-bottom: 6px;
        color: rgb(var(--color-text));
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .empty-sub {
        max-width: 300px;
        margin-bottom: 24px;
        color: rgb(var(--color-text-muted));
        font-size: 14px;
        line-height: 1.55;
      }
      .suggestions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }
      .suggestion-chip {
        border: 1px solid rgb(var(--color-brand-border));
        border-radius: var(--radius-control);
        background: rgb(var(--color-surface));
        color: rgb(var(--color-brand));
        padding: 8px 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 150ms ease, border-color 150ms ease;
      }
      .suggestion-chip:hover {
        border-color: rgb(var(--color-brand));
        background: rgb(var(--color-brand-soft));
      }

      .msg-row {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        animation: chat-message-in 180ms ease;
      }
      @keyframes chat-message-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .msg-row.user { flex-direction: row-reverse; }
      .avatar {
        display: flex;
        flex: 0 0 32px;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-bottom: 2px;
        border-radius: var(--radius-control);
      }
      .avatar.bot {
        border: 1px solid rgb(var(--color-border));
        background: rgb(var(--color-surface));
        color: rgb(var(--color-text-muted));
      }
      .avatar.user {
        background: rgb(var(--color-brand));
        color: rgb(var(--color-on-brand));
      }
      .bubble-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-width: 74%;
      }
      .bubble-wrap.user { align-items: flex-end; }
      .bubble {
        border-radius: var(--radius-card);
        padding: 11px 14px;
        font-size: 14px;
        line-height: 1.65;
      }
      .bubble.user {
        border: 1px solid rgb(var(--color-brand));
        background: rgb(var(--color-brand));
        color: rgb(var(--color-on-brand));
        font-weight: 500;
        white-space: pre-wrap;
      }
      .bubble.bot {
        border: 1px solid rgb(var(--color-border));
        background: rgb(var(--color-surface));
        color: rgb(var(--color-text));
      }
      .bubble.bot .prose p { margin: 4px 0; }
      .bubble.bot .prose ul,
      .bubble.bot .prose ol { margin: 6px 0; padding-left: 18px; }
      .bubble.bot .prose li { margin: 2px 0; }
      .bubble.bot .prose h1,
      .bubble.bot .prose h2,
      .bubble.bot .prose h3 { margin: 10px 0 4px; font-weight: 700; }
      .bubble.bot .prose code {
        border-radius: var(--radius-control);
        background: rgb(var(--color-brand-soft));
        color: rgb(var(--color-brand));
        padding: 1px 5px;
        font-size: 13px;
      }
      .bubble.bot .prose pre {
        overflow-x: auto;
        margin: 8px 0;
        border: 1px solid rgb(var(--color-border));
        border-radius: var(--radius-control);
        background: rgb(var(--color-surface-muted));
        padding: 10px 12px;
      }
      .bubble.bot .prose pre code {
        background: transparent;
        color: rgb(var(--color-text));
        padding: 0;
      }
      .bubble.bot .prose a {
        color: rgb(var(--color-brand));
        text-decoration: underline;
        text-decoration-color: rgb(var(--color-brand-border));
      }
      .bubble.bot .prose blockquote {
        margin: 6px 0;
        border-left: 3px solid rgb(var(--color-brand-border));
        padding-left: 12px;
        color: rgb(var(--color-text-muted));
      }
      .cached-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        width: fit-content;
        margin-top: 2px;
        border: 1px solid rgb(var(--color-warning-border));
        border-radius: var(--radius-control);
        background: rgb(var(--color-warning-surface));
        color: rgb(var(--color-warning));
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .typing-bubble {
        display: flex;
        align-items: center;
        gap: 4px;
        border: 1px solid rgb(var(--color-border));
        border-radius: var(--radius-card);
        background: rgb(var(--color-surface));
        padding: 12px 16px;
      }
      .typing-dot {
        width: 7px;
        height: 7px;
        border-radius: var(--radius-full);
        background: rgb(var(--color-brand));
        animation: chat-typing-bounce 1.2s ease infinite;
      }
      .typing-dot:nth-child(2) { animation-delay: 150ms; background: rgb(var(--color-brand) / 0.75); }
      .typing-dot:nth-child(3) { animation-delay: 300ms; background: rgb(var(--color-brand) / 0.5); }
      @keyframes chat-typing-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-4px); }
      }

      .input-area {
        flex-shrink: 0;
        border-top: 1px solid rgb(var(--color-border));
        background: rgb(var(--color-surface));
        padding: 16px 20px 20px;
      }
      .input-shell {
        max-width: 760px;
        margin: 0 auto;
        overflow: hidden;
        border: 1px solid rgb(var(--color-border-strong));
        border-radius: var(--radius-card);
        background: rgb(var(--color-surface));
        transition: border-color 150ms ease, box-shadow 150ms ease;
      }
      .input-shell:focus-within {
        border-color: rgb(var(--color-focus));
        box-shadow: var(--shadow-focus);
      }
      .input-row {
        display: flex;
        align-items: flex-end;
        gap: 0;
        padding: 4px 4px 4px 16px;
      }
      .chat-textarea {
        flex: 1;
        min-height: 44px;
        max-height: 200px;
        resize: none;
        border: none;
        outline: none;
        background: transparent;
        color: rgb(var(--color-text));
        padding: 10px 12px 10px 0;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.6;
      }
      .chat-textarea::placeholder { color: rgb(var(--color-text-muted)); }
      .chat-textarea:disabled { opacity: 0.55; }
      .chat-textarea:focus-visible { outline: none; }
      .send-btn {
        position: relative;
        display: flex;
        flex: 0 0 36px;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        margin-bottom: 2px;
        overflow: hidden;
        border: 1px solid rgb(var(--color-brand));
        border-radius: var(--radius-control);
        background: rgb(var(--color-brand));
        color: rgb(var(--color-on-brand));
        cursor: pointer;
        transition: background-color 150ms ease, transform 150ms ease;
      }
      .send-btn:hover:not(:disabled) { background: rgb(var(--color-brand-hover)); }
      .send-btn:active:not(:disabled) { transform: translateY(1px); }
      .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .input-hint {
        margin-top: 10px;
        color: rgb(var(--color-text-muted));
        text-align: center;
        font-size: 11px;
      }
      .input-hint kbd {
        border: 1px solid rgb(var(--color-border));
        border-radius: var(--radius-control);
        background: rgb(var(--color-surface-muted));
        color: rgb(var(--color-text-muted));
        padding: 1px 5px;
        font-family: var(--font-mono);
        font-size: 10px;
      }
    `}</style>
  );
}
