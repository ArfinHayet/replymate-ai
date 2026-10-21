(function () {
  "use strict";

  // ─── Config ──────────────────────────────────────────────────────────────────
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  var widgetKey = currentScript.getAttribute("data-key") || "";
  var apiBase = currentScript.getAttribute("data-api") || "";
  var botName = currentScript.getAttribute("data-name") || "AI Assistant";
  var brandName = currentScript.getAttribute("data-brand") || "SupportMate Ai";
  var brandUrl =
    currentScript.getAttribute("data-brand-url") || "https://supportmate.online";
  var welcomeMsg = currentScript.getAttribute("data-welcome") || "";
  var displayMode = currentScript.getAttribute("data-mode") || "bubble";
  var alwaysOpen = currentScript.getAttribute("data-open") === "true" || displayMode === "page";
  var isPageMode = displayMode === "page";
  var themeUrl =
    currentScript.getAttribute("data-theme-url") ||
    "https://www.supportmate.online/theme-tokens.css";
  var supportMateIconUrl =
    currentScript.getAttribute("data-icon") ||
    "https://www.supportmate.online/favicon.svg";
  var safeSupportMateIconUrl = supportMateIconUrl
    .replace(/&/g, "&amp;")
    .replace(/\"/g, "&quot;");
  var supportMateIconHtml =
    '<img src="' + safeSupportMateIconUrl + '" alt="" aria-hidden="true">';

  if (!widgetKey) {
    console.error("[comp-bot widget] Missing data-key attribute");
    return;
  }

  if (!apiBase) {
    console.error("[comp-bot widget] Missing data-api attribute");
    return;
  }

  apiBase = apiBase.replace(/\/+$/, "");

  // ─── Session ─────────────────────────────────────────────────────────────────
  var SESSION_KEY = "compbot_session_" + widgetKey;
  var sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId =
      "sess_" +
      Math.random().toString(36).slice(2) +
      "_" +
      Date.now().toString(36);

    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  // ─── SVG Icons ────────────────────────────────────────────────────────────────
  var ICON_SPARKLE =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 2L13.8 9.2L21 11L13.8 12.8L12 20L10.2 12.8L3 11L10.2 9.2L12 2Z" fill="currentColor"/>' +
    '<path d="M19.5 15L20.5 18L23.5 19L20.5 20L19.5 23L18.5 20L15.5 19L18.5 18L19.5 15Z" fill="currentColor" opacity="0.55"/>' +
    "</svg>";

  var ICON_X =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>";

  var ICON_SEND =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M5 12H19M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  var ICON_BOT =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 3.5C7.3 3.5 3.5 7.1 3.5 11.5C3.5 14 4.7 16.2 6.6 17.7V21L10.1 19.3C10.7 19.4 11.3 19.5 12 19.5C16.7 19.5 20.5 15.9 20.5 11.5C20.5 7.1 16.7 3.5 12 3.5Z" fill="currentColor"/>' +
    '<circle cx="9" cy="11.5" r="1" fill="white"/>' +
    '<circle cx="15" cy="11.5" r="1" fill="white"/>' +
    "</svg>";

  var ICON_MINIMIZE =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>";

  // ─── CSS ─────────────────────────────────────────────────────────────────────
  var CSS = `
    :host {
      all: initial;
      display: block;
      color: rgb(var(--color-text));
      font-family: var(--font-body);
    }

    *, *::before, *::after { box-sizing: border-box; }

    #toggle-btn {
      position: fixed;
      right: 28px;
      bottom: 28px;
      z-index: 2147483647;
      display: flex;
      width: 62px;
      height: 62px;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 0;
      border: 1px solid rgb(var(--color-border-strong));
      border-radius: var(--radius-full);
      background: rgb(var(--color-brand));
      box-shadow: var(--shadow-offset);
      cursor: pointer;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    #toggle-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-card); }
    #toggle-btn img { display: block; width: 100%; height: 100%; object-fit: cover; }
    #toggle-btn svg { width: 25px; height: 25px; color: rgb(var(--color-on-brand)); }
    #toggle-btn.open { background: rgb(var(--color-brand-tint)); }
    #toggle-btn.open svg { color: rgb(var(--color-brand)); }

    #chat-window {
      position: fixed;
      right: 28px;
      bottom: 104px;
      z-index: 2147483646;
      display: flex;
      width: 390px;
      max-width: calc(100vw - 32px);
      height: 570px;
      max-height: calc(100vh - 130px);
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgb(var(--color-border-strong));
      border-radius: var(--radius-card);
      background: rgb(var(--color-surface));
      box-shadow: var(--shadow-offset);
      transition: opacity .25s ease, transform .32s ease;
      transform-origin: bottom right;
    }
    #chat-window.hidden { opacity: 0; pointer-events: none; transform: scale(.96) translateY(12px); }
    :host(.compbot-page-mode) #toggle-btn { display: none; }
    :host(.compbot-page-mode) #chat-window {
      top: 0;
      right: auto;
      bottom: 0;
      left: 50%;
      width: 60vw;
      max-width: none;
      height: 100vh;
      height: 100dvh;
      max-height: none;
      border-radius: 0;
      transform: translateX(-50%);
      transform-origin: center;
    }
    :host(.compbot-page-mode) #chat-window.hidden { transform: translateX(-50%) translateY(12px); }
    :host(.compbot-page-mode) #minimize-btn { display: none; }
    :host(.compbot-page-mode) #chat-header { padding-top: calc(18px + env(safe-area-inset-top)); }
    :host(.compbot-page-mode) #input-row {
      padding: 12px max(12px, env(safe-area-inset-right)) 12px max(12px, env(safe-area-inset-left));
    }
    :host(.compbot-page-mode) #chat-footer { padding-bottom: calc(9px + env(safe-area-inset-bottom)); }

    #chat-header {
      position: relative;
      flex-shrink: 0;
      overflow: hidden;
      padding: 18px;
      border-bottom: 1px solid rgb(var(--color-border-strong));
      background-color: rgb(var(--color-brand));
      background-image:
        linear-gradient(to right, rgb(var(--color-on-brand) / .08) 1px, transparent 1px),
        linear-gradient(to bottom, rgb(var(--color-on-brand) / .08) 1px, transparent 1px);
      background-size: 24px 24px;
      color: rgb(var(--color-on-brand));
    }
    #header-inner { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; }
    #bot-avatar {
      display: flex;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 1px solid rgb(var(--color-on-brand) / .55);
      border-radius: var(--radius-card);
      background: rgb(var(--color-surface));
    }
    #bot-avatar img { display: block; width: 100%; height: 100%; object-fit: cover; }
    #bot-avatar svg { width: 24px; height: 24px; color: rgb(var(--color-brand)); }
    #header-text { flex: 1; min-width: 0; }
    #bot-name {
      display: block;
      color: rgb(var(--color-on-brand));
      font-family: var(--font-display);
      font-size: 15.5px;
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: -.02em;
    }
    #bot-status {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      color: rgb(var(--color-terminal-muted));
      font-size: 12px;
      font-weight: 600;
    }
    #status-dot {
      width: 7px;
      height: 7px;
      flex-shrink: 0;
      border-radius: var(--radius-full);
      background: rgb(var(--color-success));
      box-shadow: 0 0 0 3px rgb(var(--color-success) / .2);
    }

    #minimize-btn {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      padding: 8px;
      border: 1px solid rgb(var(--color-terminal-border));
      border-radius: var(--radius-control);
      background: rgb(var(--color-brand-active));
      color: rgb(var(--color-on-brand));
      cursor: pointer;
      transition: background .2s ease;
    }
    #minimize-btn:hover { background: rgb(var(--color-brand-hover)); }
    #minimize-btn svg { width: 17px; height: 17px; color: currentColor; }

    #messages {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 11px;
      overflow-y: auto;
      padding: 16px 14px;
      background: rgb(var(--color-canvas));
      scroll-behavior: smooth;
    }
    #messages::-webkit-scrollbar { width: 4px; }
    #messages::-webkit-scrollbar-track { background: transparent; }
    #messages::-webkit-scrollbar-thumb { border-radius: var(--radius-full); background: rgb(var(--color-brand-border)); }

    .msg {
      max-width: 84%;
      padding: 11px 14px;
      border: 1px solid transparent;
      border-radius: var(--radius-card);
      font-family: var(--font-body);
      font-size: 13.5px;
      line-height: 1.58;
      word-break: break-word;
      animation: msg-in .28s ease both;
    }
    @keyframes msg-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .msg.user {
      align-self: flex-end;
      border-color: rgb(var(--color-brand-active));
      background: rgb(var(--color-brand));
      box-shadow: var(--shadow-control);
      color: rgb(var(--color-on-brand));
      font-weight: 600;
    }
    .msg.bot {
      align-self: flex-start;
      border-color: rgb(var(--color-border));
      background: rgb(var(--color-surface));
      box-shadow: var(--shadow-control);
      color: rgb(var(--color-text));
    }
    .msg.error {
      align-self: flex-start;
      border-color: rgb(var(--color-error-border));
      background: rgb(var(--color-error-surface));
      color: rgb(var(--color-error));
    }
    .msg.welcome {
      border-color: rgb(var(--color-brand-border));
      background: rgb(var(--color-brand-tint));
      color: rgb(var(--color-text));
      font-size: 13px;
      font-weight: 600;
    }

    #suggestions {
      display: none;
      width: 100%;
      flex-shrink: 0;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 10px 14px 12px;
      border-top: 1px solid rgb(var(--color-border));
      background: rgb(var(--color-surface));
    }
    #suggestions.visible { display: flex; }
    .suggestion-btn {
      width: 100%;
      max-width: 280px;
      overflow: hidden;
      padding: 9px 12px;
      border: 1px solid rgb(var(--color-brand-border));
      border-radius: var(--radius-control);
      background: rgb(var(--color-surface));
      box-shadow: var(--shadow-control);
      color: rgb(var(--color-brand));
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.25;
      text-overflow: ellipsis;
      transition: background .2s ease, border-color .2s ease, transform .2s ease;
      white-space: nowrap;
    }
    .suggestion-btn:hover {
      transform: translateY(-1px);
      border-color: rgb(var(--color-brand));
      background: rgb(var(--color-brand-tint));
    }

    .typing {
      display: flex;
      align-self: flex-start;
      align-items: center;
      gap: 5px;
      padding: 13px 16px;
      border: 1px solid rgb(var(--color-border));
      border-radius: var(--radius-card);
      background: rgb(var(--color-surface));
      box-shadow: var(--shadow-control);
      animation: msg-in .28s ease both;
    }
    .typing span {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full);
      background: rgb(var(--color-brand));
      animation: dot-wave 1.2s ease-in-out infinite;
    }
    .typing span:nth-child(2) { animation-delay: .14s; }
    .typing span:nth-child(3) { animation-delay: .28s; }
    @keyframes dot-wave {
      0%, 60%, 100% { transform: translateY(0); opacity: .35; }
      30% { transform: translateY(-7px); opacity: 1; }
    }

    #input-row {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: 10px;
      padding: 13px;
      border-top: 1px solid rgb(var(--color-border));
      background: rgb(var(--color-surface));
    }
    #user-input {
      flex: 1;
      height: 46px;
      min-height: 46px;
      max-height: 46px;
      overflow-y: auto;
      padding: 12px 14px;
      border: 1px solid rgb(var(--color-border));
      border-radius: var(--radius-control);
      outline: none;
      background: rgb(var(--color-surface));
      color: rgb(var(--color-text));
      caret-color: rgb(var(--color-brand));
      font-family: var(--font-body);
      font-size: 13.5px;
      font-weight: 500;
      line-height: 20px;
      resize: none;
      transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
    }
    #user-input::placeholder { color: rgb(var(--color-text-muted)); font-weight: 500; }
    #user-input:focus {
      border-color: rgb(var(--color-brand));
      background: rgb(var(--color-surface));
      box-shadow: var(--shadow-focus);
    }
    #user-input:disabled { background: rgb(var(--color-disabled-bg)); color: rgb(var(--color-disabled-text)); cursor: not-allowed; }
    #user-input::-webkit-scrollbar { width: 3px; }
    #user-input::-webkit-scrollbar-track { background: transparent; }
    #user-input::-webkit-scrollbar-thumb { border-radius: var(--radius-full); background: rgb(var(--color-brand-border)); }

    #send-btn {
      display: flex;
      width: 46px;
      height: 46px;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border: 1px solid rgb(var(--color-brand-active));
      border-radius: var(--radius-control);
      background: rgb(var(--color-brand));
      box-shadow: var(--shadow-control);
      cursor: pointer;
      transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
    }
    #send-btn:hover:not(:disabled) { transform: translateY(-1px); background: rgb(var(--color-brand-hover)); box-shadow: var(--shadow-card); }
    #send-btn:active:not(:disabled) { transform: scale(.97); }
    #send-btn:disabled { border-color: rgb(var(--color-border)); background: rgb(var(--color-disabled-bg)); box-shadow: none; cursor: not-allowed; }
    #send-btn svg { width: 18px; height: 18px; color: rgb(var(--color-on-brand)); }
    #send-btn:disabled svg { color: rgb(var(--color-disabled-text)); }

    #chat-footer {
      flex-shrink: 0;
      padding: 7px 0 9px;
      border-top: 1px solid rgb(var(--color-border));
      background: rgb(var(--color-surface-muted));
      color: rgb(var(--color-text-muted));
      font-family: var(--font-body);
      font-size: 10.5px;
      letter-spacing: .03em;
      text-align: center;
    }
    #chat-footer a { color: rgb(var(--color-brand)); font-weight: 700; text-decoration: none; }
    #chat-footer a:hover { text-decoration: underline; }

    .msg.bot p { margin: 0 0 6px; }
    .msg.bot p:last-child { margin-bottom: 0; }
    .msg.bot ul, .msg.bot ol { margin: 4px 0 6px 18px; padding: 0; }
    .msg.bot li { margin-bottom: 3px; }
    .msg.bot code {
      padding: 2px 6px;
      border: 1px solid rgb(var(--color-border));
      border-radius: var(--radius-control);
      background: rgb(var(--color-surface-muted));
      color: rgb(var(--color-brand));
      font-family: var(--font-mono);
      font-size: 12px;
    }
    .msg.bot pre {
      overflow-x: auto;
      margin: 6px 0;
      padding: 12px 14px;
      border: 1px solid rgb(var(--color-terminal-border));
      border-radius: var(--radius-control);
      background: rgb(var(--color-terminal-bg));
      color: rgb(var(--color-terminal-text));
    }
    .msg.bot pre code { padding: 0; border: 0; background: transparent; color: inherit; font-size: 12px; }
    .msg.bot strong { color: rgb(var(--color-text)); font-weight: 800; }
    .msg.bot em { color: rgb(var(--color-brand)); font-style: italic; }
    .msg.bot a { border-bottom: 1px solid rgb(var(--color-brand-border)); color: rgb(var(--color-brand)); text-decoration: none; }
    .msg.bot a:hover { border-color: rgb(var(--color-brand)); }
    .msg.bot hr { margin: 8px 0; border: 0; border-top: 1px solid rgb(var(--color-border)); }
    .msg.bot h1, .msg.bot h2, .msg.bot h3 {
      margin: 8px 0 4px;
      color: rgb(var(--color-text));
      font-family: var(--font-display);
      font-weight: 800;
      letter-spacing: -.02em;
    }
    .msg.bot h1 { font-size: 1.12em; }
    .msg.bot h2 { font-size: 1.06em; }
    .msg.bot h3 { font-size: 1em; }
    .msg.bot table { display: block; min-width: 100%; overflow-x: auto; margin: 6px 0; border-collapse: collapse; font-size: 12px; }
    .msg.bot th, .msg.bot td { padding: 6px 10px; border: 1px solid rgb(var(--color-border)); text-align: left; }
    .msg.bot th { background: rgb(var(--color-brand-tint)); color: rgb(var(--color-brand)); font-size: 10.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
    .msg.bot blockquote {
      margin: 6px 0;
      padding: 7px 12px;
      border-left: 3px solid rgb(var(--color-brand));
      background: rgb(var(--color-brand-tint));
      color: rgb(var(--color-text-muted));
    }

    @media (max-width: 768px) {
      #toggle-btn { right: 18px; bottom: 18px; width: 58px; height: 58px; }
      #toggle-btn.open { display: none; }
      #chat-window { inset: 0; width: 100vw; max-width: none; height: 100vh; height: 100dvh; max-height: none; border: 0; border-radius: 0; transform-origin: center; }
      #chat-window.hidden { transform: translateY(100%); }
      :host(.compbot-page-mode) #toggle-btn.open { display: none; }
      :host(.compbot-page-mode) #chat-window { inset: 0; width: 100vw; max-width: none; height: 100vh; height: 100dvh; max-height: none; border: 0; border-radius: 0; transform: none; transform-origin: center; }
      :host(.compbot-page-mode) #chat-window.hidden { transform: translateY(100%); }
      #chat-header { padding-top: calc(18px + env(safe-area-inset-top)); }
      #messages { padding: 14px 12px; }
      #suggestions { padding: 10px 12px 12px; }
      #input-row { padding: 12px max(12px, env(safe-area-inset-right)) 12px max(12px, env(safe-area-inset-left)); }
      #chat-footer { padding-bottom: calc(9px + env(safe-area-inset-bottom)); }
    }
  `;

  // ─── Markdown Renderer ───────────────────────────────────────────────────────
  function renderMarkdown(src) {
    function esc(s) {
      return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function escAttr(s) {
      return esc(s)
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function fmt(s) {
      var protectedHtml = [];

      function protect(html) {
        var token = "\x01" + protectedHtml.length + "\x02";
        protectedHtml.push(html);
        return token;
      }

      s = String(s || "").replace(/<br\s*\/?>/gi, "\x00");
      s = s
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, url) {
          return protect(
            '<img src="' +
              escAttr(url) +
              '" alt="' +
              escAttr(alt) +
              '" style="max-width:100%;border-radius:10px;margin:6px 0;">'
          );
        })
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, url) {
          return protect(
            '<a href="' +
              escAttr(url) +
              '" target="_blank" rel="noopener">' +
              fmt(label) +
              "</a>"
          );
        });

      s = esc(s);
      s = s.replace(/\x00/g, "<br>");

      return s
        .replace(/`([^`]+)`/g, function (_, c) {
          return "<code>" + c + "</code>";
        })
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
        .replace(/_([^_\n]+)_/g, "<em>$1</em>")
        .replace(/~~(.+?)~~/g, "<del>$1</del>")
        .replace(/\x01(\d+)\x02/g, function (_, index) {
          return protectedHtml[Number(index)] || "";
        });
    }

    function parseCells(row) {
      return row
        .replace(/^\||\|$/g, "")
        .split("|")
        .map(function (c) {
          return fmt(c.trim());
        });
    }

    var lines = String(src || "").split("\n");
    var html = "";
    var i = 0;

    while (i < lines.length) {
      var ln = lines[i];

      if (/^```/.test(ln)) {
        var lang = ln.replace(/^```/, "").trim();
        var cb = [];
        i++;

        while (i < lines.length && !/^```/.test(lines[i])) {
          cb.push(esc(lines[i++]));
        }

        html +=
          "<pre><code" +
          (lang ? ' class="lang-' + lang + '"' : "") +
          ">" +
          cb.join("\n") +
          "</code></pre>";

        i++;
        continue;
      }

      var hm = ln.match(/^(#{1,6}) (.*)/);

      if (hm) {
        html +=
          "<h" + hm[1].length + ">" + fmt(hm[2]) + "</h" + hm[1].length + ">";
        i++;
        continue;
      }

      if (/^\s*([-*_]\s*){3,}$/.test(ln) && !/^[-*+] /.test(ln)) {
        html += "<hr>";
        i++;
        continue;
      }

      if (/^> ?/.test(ln)) {
        var bq = [];

        while (i < lines.length && /^>/.test(lines[i])) {
          bq.push(lines[i++].replace(/^> ?/, ""));
        }

        html +=
          "<blockquote>" + renderMarkdown(bq.join("\n")) + "</blockquote>";
        continue;
      }

      if (/^[-*+] /.test(ln)) {
        html += "<ul>";

        while (i < lines.length && /^[-*+] /.test(lines[i])) {
          html += "<li>" + fmt(lines[i++].slice(2)) + "</li>";
        }

        html += "</ul>";
        continue;
      }

      if (/^\d+\.\s/.test(ln)) {
        html += "<ol>";

        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          html += "<li>" + fmt(lines[i++].replace(/^\d+\.\s+/, "")) + "</li>";
        }

        html += "</ol>";
        continue;
      }

      if (/\|/.test(ln) && lines[i + 1] && /^[|\s:\- ]+$/.test(lines[i + 1])) {
        html +=
          "<table><thead><tr>" +
          parseCells(ln)
            .map(function (c) {
              return "<th>" + c + "</th>";
            })
            .join("") +
          "</tr></thead><tbody>";

        i += 2;

        while (i < lines.length && /\|/.test(lines[i])) {
          html +=
            "<tr>" +
            parseCells(lines[i++])
              .map(function (c) {
                return "<td>" + c + "</td>";
              })
              .join("") +
            "</tr>";
        }

        html += "</tbody></table>";
        continue;
      }

      if (!ln.trim()) {
        i++;
        continue;
      }

      var p = [];

      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^[#>`]/.test(lines[i]) &&
        !/^[-*+] /.test(lines[i]) &&
        !/^\d+\.\s/.test(lines[i]) &&
        !/^\s*([-*_]\s*){3,}$/.test(lines[i]) &&
        !/^```/.test(lines[i]) &&
        !(
          /\|/.test(lines[i]) &&
          lines[i + 1] &&
          /^[|\s:\- ]+$/.test(lines[i + 1])
        )
      ) {
        p.push(lines[i++]);
      }

      if (p.length) {
        html += "<p>" + fmt(p.join("<br>")) + "</p>";
      } else {
        html += "<p>" + fmt(ln) + "</p>";
        i++;
      }
    }

    return html || "<p>" + esc(src) + "</p>";
  }

  // ─── Boot ────────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    // ─── Shadow DOM ────────────────────────────────────────────────────────────
    var host = document.createElement("div");
    host.id = "compbot-widget-host";
    if (isPageMode) {
      host.className = "compbot-page-mode";
    }

    var shadow = host.attachShadow({ mode: "open" });

    var themeStylesheet = document.createElement("link");
    themeStylesheet.rel = "stylesheet";
    themeStylesheet.href = themeUrl;
    shadow.appendChild(themeStylesheet);

    var fontStylesheet = document.createElement("link");
    fontStylesheet.rel = "stylesheet";
    fontStylesheet.href =
      "https://fonts.googleapis.com/css2?family=Geist:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
    shadow.appendChild(fontStylesheet);

    var style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);

    // ─── Toggle Button ─────────────────────────────────────────────────────────
    var toggleBtn = document.createElement("button");
    toggleBtn.id = "toggle-btn";
    toggleBtn.setAttribute("aria-label", "Open chat");
    toggleBtn.innerHTML = supportMateIconHtml;
    shadow.appendChild(toggleBtn);

    // ─── Chat Window ───────────────────────────────────────────────────────────
    var chatWindow = document.createElement("div");
    chatWindow.id = "chat-window";
    chatWindow.className = "hidden";
    chatWindow.setAttribute("role", "dialog");
    chatWindow.setAttribute("aria-label", "Chat assistant");

    // Header
    var header = document.createElement("div");
    header.id = "chat-header";

    var headerInner = document.createElement("div");
    headerInner.id = "header-inner";

    var avatar = document.createElement("div");
    avatar.id = "bot-avatar";
    avatar.innerHTML = supportMateIconHtml;

    var headerText = document.createElement("div");
    headerText.id = "header-text";

    var nameEl = document.createElement("span");
    nameEl.id = "bot-name";
    nameEl.textContent = botName;

    var statusEl = document.createElement("div");
    statusEl.id = "bot-status";

    var dot = document.createElement("span");
    dot.id = "status-dot";

    statusEl.appendChild(dot);
    statusEl.appendChild(document.createTextNode("Online · ready to help"));

    headerText.appendChild(nameEl);
    headerText.appendChild(statusEl);

    var minBtn = document.createElement("button");
    minBtn.id = "minimize-btn";
    minBtn.setAttribute("aria-label", "Close chat");
    minBtn.innerHTML = ICON_MINIMIZE;

    headerInner.appendChild(avatar);
    headerInner.appendChild(headerText);
    headerInner.appendChild(minBtn);
    header.appendChild(headerInner);

    // Messages
    var messages = document.createElement("div");
    messages.id = "messages";
    messages.setAttribute("aria-live", "polite");

    var suggestionsEl = document.createElement("div");
    suggestionsEl.id = "suggestions";

    // Input Row
    var inputRow = document.createElement("div");
    inputRow.id = "input-row";

    var userInput = document.createElement("textarea");
    userInput.id = "user-input";
    userInput.rows = 1;
    userInput.placeholder = "Ask anything…";
    userInput.setAttribute("aria-label", "Message input");

    var sendBtn = document.createElement("button");
    sendBtn.id = "send-btn";
    sendBtn.setAttribute("aria-label", "Send message");
    sendBtn.innerHTML = ICON_SEND;

    inputRow.appendChild(userInput);
    inputRow.appendChild(sendBtn);

    // Footer
    var footer = document.createElement("div");
    footer.id = "chat-footer";
    var footerLink = document.createElement("a");
    footerLink.href = brandUrl;
    footerLink.target = "_blank";
    footerLink.rel = "noopener noreferrer";
    footerLink.textContent = brandName;
    footer.appendChild(document.createTextNode("Powered by "));
    footer.appendChild(footerLink);

    chatWindow.appendChild(header);
    chatWindow.appendChild(messages);
    chatWindow.appendChild(suggestionsEl);
    chatWindow.appendChild(inputRow);
    chatWindow.appendChild(footer);

    shadow.appendChild(chatWindow);
    document.body.appendChild(host);

    // ─── State ─────────────────────────────────────────────────────────────────
    var isOpen = false;
    var isLoading = false;
    var hasOpened = false;
    var hasSentMessage = false;
    var widgetSuggestions = [];

    // ─── Helpers ───────────────────────────────────────────────────────────────
    function scrollToBottom() {
      messages.scrollTop = messages.scrollHeight;
    }

    function addMessage(text, role) {
      var el = document.createElement("div");
      el.className = "msg " + role;

      if (role === "bot" || role === "welcome") {
        el.innerHTML = renderMarkdown(text);
      } else {
        el.textContent = text;
      }

      messages.appendChild(el);
      scrollToBottom();

      return el;
    }

    function showTyping() {
      var el = document.createElement("div");
      el.className = "typing";
      el.id = "typing-indicator";
      el.innerHTML = "<span></span><span></span><span></span>";
      messages.appendChild(el);
      scrollToBottom();
    }

    function hideTyping() {
      var el = shadow.getElementById("typing-indicator");

      if (el) {
        el.remove();
      }
    }

    function setLoading(val) {
      isLoading = val;
      sendBtn.disabled = val;
      userInput.disabled = val;

      if (val) {
        statusEl.lastChild.textContent = " Thinking…";
      } else {
        statusEl.lastChild.textContent = " Online · ready to help";
      }
    }

    function renderSuggestions() {
      suggestionsEl.innerHTML = "";

      if (hasSentMessage) {
        suggestionsEl.classList.remove("visible");
        return;
      }

      var suggestions = widgetSuggestions.slice(0, 3);
      if (!suggestions.length) {
        suggestionsEl.classList.remove("visible");
        return;
      }

      suggestions.forEach(function (suggestion) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "suggestion-btn";
        btn.textContent = suggestion;
        btn.title = suggestion;
        btn.addEventListener("click", function () {
          sendMessage(suggestion);
        });
        suggestionsEl.appendChild(btn);
      });

      suggestionsEl.classList.add("visible");
    }

    function loadSuggestions() {
      fetch(apiBase + "/widget/" + widgetKey + "/suggestions", {
        method: "GET"
      })
        .then(function (res) {
          if (!res.ok) return { suggestions: [] };
          return res.json();
        })
        .then(function (data) {
          widgetSuggestions = Array.isArray(data.suggestions)
            ? data.suggestions.filter(function (item) {
                return typeof item === "string" && item.trim();
              })
            : [];
          renderSuggestions();
        })
        .catch(function () {
          widgetSuggestions = [];
          renderSuggestions();
        });
    }

    function openChat() {
      isOpen = true;

      chatWindow.classList.remove("hidden");
      toggleBtn.classList.add("open");
      toggleBtn.innerHTML = ICON_X;
      toggleBtn.setAttribute("aria-label", "Close chat");

      if (!hasOpened && welcomeMsg) {
        hasOpened = true;

        setTimeout(function () {
          addMessage(welcomeMsg, "welcome");
        }, 220);
      } else {
        hasOpened = true;
      }

      setTimeout(function () {
        userInput.focus();
      }, 80);
    }

    function closeChat(force) {
      if (alwaysOpen && !force) {
        return;
      }

      isOpen = false;

      chatWindow.classList.add("hidden");
      toggleBtn.classList.remove("open");
      toggleBtn.innerHTML = supportMateIconHtml;
      toggleBtn.setAttribute("aria-label", "Open chat");
    }

    toggleBtn.addEventListener("click", function () {
      if (isOpen) {
        closeChat();
      } else {
        openChat();
      }
    });

    minBtn.addEventListener("click", closeChat);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) {
        closeChat();
      }
    });

    // ─── Send Message ──────────────────────────────────────────────────────────
    function sendMessage(forcedText) {
      var text =
        typeof forcedText === "string"
          ? forcedText.trim()
          : userInput.value.trim();

      if (!text || isLoading) {
        return;
      }

      userInput.value = "";
      hasSentMessage = true;
      renderSuggestions();

      addMessage(text, "user");

      setLoading(true);
      showTyping();

      var payload = {
        message: text,
        sessionId: sessionId
      };

      fetch(apiBase + "/widget/" + widgetKey + "/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) {
            return res
              .json()
              .catch(function () {
                return {};
              })
              .then(function (body) {
                throw new Error(
                  body.message || "Request failed: " + res.status
                );
              });
          }

          return res.json();
        })
        .then(function (data) {
          hideTyping();

          var reply =
            data.message || data.answer || data.response || "No response";

          addMessage(reply, "bot");
        })
        .catch(function (err) {
          hideTyping();
          addMessage("⚠ " + err.message, "error");
        })
        .finally(function () {
          setLoading(false);
        });
    }

    sendBtn.addEventListener("click", sendMessage);

    userInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    if (alwaysOpen) {
      openChat();
    }

    loadSuggestions();

    /*
      Important:
      No auto-grow input event here.
      The textarea now stays fixed at 46px height.
    */
  }
})();
