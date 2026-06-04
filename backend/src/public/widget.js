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
  var supportMateIconUrl = "https://www.supportmate.online/favicon.svg";
  var supportMateIconHtml =
    '<img src="' + supportMateIconUrl + '" alt="" aria-hidden="true">';

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

  // ─── Google Fonts ─────────────────────────────────────────────────────────────
  if (!document.getElementById("compbot-fonts")) {
    var fl = document.createElement("link");
    fl.id = "compbot-fonts";
    fl.rel = "stylesheet";
    fl.href =
      "https://fonts.googleapis.com/css2?family=Geist:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(fl);
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
  var CSS = [
    ":host{",
    "all:initial;",
    "--rm-trip-brand:#2563eb;",
    "--rm-trip-brand-soft:#dbeafe;",
    "--rm-trip-brand-light:#1d4ed8;",
    "--rm-trip-accent:#14b8a6;",
    "--rm-trip-accent-soft:#ecfeff;",
    "--rm-trip-surface:#f6f8fb;",
    "--rm-trip-card:#ffffff;",
    "--rm-trip-border:#e2e8f0;",
    "--rm-trip-text:#0f172a;",
    "--rm-trip-muted:#64748b;",
    "--rm-trip-success:#16a34a;",
    "--rm-trip-error:#dc2626;",
    'font-family:"Inter",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    "}",

    "*{box-sizing:border-box;}",

    "#toggle-btn{",
    "position:fixed;bottom:28px;right:28px;z-index:2147483647;",
    "width:62px;height:62px;border-radius:999px;",
    "background:transparent;",
    "border:0;",
    "cursor:pointer;",
    "display:flex;align-items:center;justify-content:center;",
    "overflow:hidden;",
    "box-shadow:0 18px 44px rgba(15,23,42,.24),0 8px 22px rgba(37,99,235,.26);",
    "transition:transform .28s ease,box-shadow .28s ease,background .28s ease,border-color .28s ease;",
    "}",
    "#toggle-btn:hover{",
    "transform:translateY(-3px) scale(1.04);",
    "box-shadow:0 24px 56px rgba(15,23,42,.28),0 12px 28px rgba(37,99,235,.34);",
    "}",
    "#toggle-btn svg{width:25px;height:25px;color:#ffffff;}",
    "#toggle-btn img{width:100%;height:100%;display:block;object-fit:cover;transform:scale(1.32);}",
    "#toggle-btn.open{background:transparent;border-color:transparent;}",
    "#toggle-btn.open svg{color:var(--rm-trip-brand);}",

    "#chat-window{",
    "position:fixed;bottom:104px;right:28px;z-index:2147483646;",
    "width:390px;max-width:calc(100vw - 32px);",
    "height:570px;max-height:calc(100vh - 130px);",
    "display:flex;flex-direction:column;overflow:hidden;",
    "border-radius:18px;",
    "background:#ffffff;",
    "border:1px solid var(--rm-trip-border);",
    "box-shadow:0 26px 90px rgba(17,24,39,.16);",
    "transition:opacity .25s ease,transform .32s ease;",
    "transform-origin:bottom right;",
    "}",
    "#chat-window.hidden{opacity:0;pointer-events:none;transform:scale(.92) translateY(18px);}",
    ":host(.compbot-page-mode) #toggle-btn{display:none;}",
    ":host(.compbot-page-mode) #chat-window{top:0;right:auto;bottom:0;left:50%;width:60vw;max-width:none;height:100vh;height:100dvh;max-height:none;border-radius:0;transform:translateX(-50%);transform-origin:center;border-top:0;border-bottom:0;}",
    ":host(.compbot-page-mode) #chat-window.hidden{transform:translateX(-50%) translateY(18px);}",
    ":host(.compbot-page-mode) #minimize-btn{display:none;}",
    ":host(.compbot-page-mode) #chat-header{padding-top:calc(18px + env(safe-area-inset-top));}",
    ":host(.compbot-page-mode) #input-row{padding:12px max(12px,env(safe-area-inset-right)) 12px max(12px,env(safe-area-inset-left));}",
    ":host(.compbot-page-mode) #chat-footer{padding-bottom:calc(9px + env(safe-area-inset-bottom));}",

    "#chat-header{",
    "position:relative;padding:18px;flex-shrink:0;overflow:hidden;",
    "background:#ffffff;",
    "border-bottom:1px solid var(--rm-trip-border);",
    "}",
    "#chat-header::before{",
    'content:"";position:absolute;top:-45px;right:-30px;',
    "width:160px;height:160px;",
    "background:radial-gradient(circle,rgba(37,99,235,.16),transparent 70%);",
    "pointer-events:none;",
    "}",
    "#chat-header::after{",
    'content:"";position:absolute;bottom:-55px;left:-28px;',
    "width:135px;height:135px;",
    "background:radial-gradient(circle,rgba(20,184,166,.13),transparent 70%);",
    "pointer-events:none;",
    "}",

    "#header-inner{position:relative;z-index:1;display:flex;align-items:center;gap:12px;}",
    "#bot-avatar{",
    "width:44px;height:44px;border-radius:16px;flex-shrink:0;",
    "background:transparent;",
    "display:flex;align-items:center;justify-content:center;",
    "overflow:hidden;",
    "box-shadow:0 10px 24px rgba(37,99,235,.22);",
    "}",
    "#bot-avatar svg{width:24px;height:24px;color:#ffffff;}",
    "#bot-avatar img{width:100%;height:100%;display:block;object-fit:cover;transform:scale(1.32);}",

    "#header-text{flex:1;min-width:0;}",
    "#bot-name{",
    'font-family:"Geist",system-ui,sans-serif;',
    "font-size:15.5px;font-weight:700;color:var(--rm-trip-text);",
    "display:block;line-height:1.25;letter-spacing:-.02em;",
    "}",
    "#bot-status{",
    "font-size:12px;color:var(--rm-trip-muted);",
    "display:flex;align-items:center;gap:6px;margin-top:4px;font-weight:600;",
    "}",
    "#status-dot{",
    "width:7px;height:7px;border-radius:999px;flex-shrink:0;",
    "background:var(--rm-trip-success);",
    "box-shadow:0 0 0 4px rgba(22,163,74,.12);",
    "}",

    "#minimize-btn{",
    "background:#f8fafc;border:1px solid #e5e7eb;cursor:pointer;",
    "padding:8px;border-radius:12px;flex-shrink:0;",
    "display:flex;align-items:center;justify-content:center;",
    "transition:all .2s ease;",
    "}",
    "#minimize-btn:hover{background:#eff6ff;border-color:#bfdbfe;}",
    "#minimize-btn svg{width:17px;height:17px;color:var(--rm-trip-brand);}",

    "#messages{",
    "flex:1;overflow-y:auto;padding:16px 14px;",
    "display:flex;flex-direction:column;gap:11px;",
    "scroll-behavior:smooth;background:var(--rm-trip-surface);",
    "}",
    "#messages::-webkit-scrollbar{width:4px;}",
    "#messages::-webkit-scrollbar-track{background:transparent;}",
    "#messages::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:999px;}",

    ".msg{",
    "max-width:84%;padding:11px 14px;border-radius:18px;",
    "font-size:13.5px;line-height:1.58;word-break:break-word;",
    'font-family:"Inter",system-ui,sans-serif;',
    "animation:msg-in .28s ease both;",
    "}",
    "@keyframes msg-in{",
    "from{opacity:0;transform:translateY(10px);}",
    "to{opacity:1;transform:translateY(0);}",
    "}",

    ".msg.user{",
    "align-self:flex-end;border-bottom-right-radius:6px;",
    "background:var(--rm-trip-brand);",
    "color:#ffffff;font-weight:600;",
    "box-shadow:0 8px 22px rgba(37,99,235,.24);",
    "}",
    ".msg.bot{",
    "align-self:flex-start;border-bottom-left-radius:6px;",
    "background:#ffffff;color:#1f2937;",
    "border:1px solid var(--rm-trip-border);",
    "box-shadow:0 4px 14px rgba(17,24,39,.05);",
    "}",
    ".msg.error{",
    "align-self:flex-start;border-bottom-left-radius:6px;",
    "background:#fef2f2;color:var(--rm-trip-error);",
    "border:1px solid #fecaca;",
    "}",

    ".msg.welcome{",
    "background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;",
    "font-size:13px;font-weight:600;",
    "}",

    "#suggestions{",
    "display:none;flex-direction:column;align-items:center;justify-content:center;gap:9px;",
    "width:100%;max-width:280px;margin:auto;padding:8px;",
    "background:transparent;",
    "}",
    "#suggestions.visible{display:flex;}",
    ".suggestion-btn{",
    "width:100%;max-width:280px;border:1px solid #dbeafe;background:#ffffff;",
    "color:var(--rm-trip-brand);border-radius:999px;",
    "padding:9px 12px;font-size:12px;font-weight:700;line-height:1.25;",
    "cursor:pointer;transition:all .2s ease;",
    "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
    "box-shadow:0 8px 22px rgba(37,99,235,.08);",
    "}",
    ".suggestion-btn:hover{background:#eff6ff;border-color:#bfdbfe;transform:translateY(-1px);}",

    ".typing{",
    "display:flex;align-items:center;gap:5px;",
    "padding:13px 16px;",
    "background:#ffffff;border:1px solid var(--rm-trip-border);",
    "border-radius:18px;border-bottom-left-radius:6px;",
    "align-self:flex-start;",
    "box-shadow:0 4px 14px rgba(17,24,39,.05);",
    "animation:msg-in .28s ease both;",
    "}",
    ".typing span{",
    "width:6px;height:6px;background:var(--rm-trip-brand);",
    "border-radius:999px;animation:dot-wave 1.2s ease-in-out infinite;",
    "}",
    ".typing span:nth-child(2){animation-delay:.14s;}",
    ".typing span:nth-child(3){animation-delay:.28s;}",
    "@keyframes dot-wave{",
    "0%,60%,100%{transform:translateY(0);opacity:.35;}",
    "30%{transform:translateY(-7px);opacity:1;}",
    "}",

    "#input-row{",
    "display:flex;align-items:center;gap:10px;",
    "padding:13px;flex-shrink:0;",
    "background:#ffffff;border-top:1px solid var(--rm-trip-border);",
    "}",

    "#user-input{",
    "flex:1;",
    "height:46px;min-height:46px;max-height:46px;",
    "background:#f8fafc;",
    "border:1px solid #e5e7eb;",
    "border-radius:16px;",
    "padding:12px 14px;",
    "font-size:13.5px;",
    'font-family:"Inter",system-ui,sans-serif;',
    "font-weight:600;",
    "color:var(--rm-trip-text);",
    "outline:none;",
    "resize:none;",
    "overflow-y:auto;",
    "line-height:20px;",
    "transition:border-color .2s ease,background .2s ease,box-shadow .2s ease;",
    "caret-color:var(--rm-trip-brand);",
    "box-sizing:border-box;",
    "}",
    "#user-input::placeholder{color:#94a3b8;font-weight:500;}",
    "#user-input:focus{",
    "background:#ffffff;",
    "border-color:var(--rm-trip-brand-light);",
    "box-shadow:0 0 0 4px rgba(96,165,250,.18);",
    "}",
    "#user-input:disabled{opacity:.75;cursor:not-allowed;}",
    "#user-input::-webkit-scrollbar{width:3px;}",
    "#user-input::-webkit-scrollbar-track{background:transparent;}",
    "#user-input::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:999px;}",

    "#send-btn{",
    "width:46px;height:46px;flex-shrink:0;border:none;border-radius:16px;cursor:pointer;",
    "background:var(--rm-trip-brand);",
    "display:flex;align-items:center;justify-content:center;",
    "transition:transform .24s ease,box-shadow .24s ease,background .24s ease;",
    "box-shadow:0 8px 20px rgba(37,99,235,.24);",
    "}",
    "#send-btn:hover:not(:disabled){",
    "transform:translateY(-2px);",
    "box-shadow:0 12px 26px rgba(37,99,235,.32);",
    "}",
    "#send-btn:active:not(:disabled){transform:scale(.96);}",
    "#send-btn:disabled{background:#cbd5e1;box-shadow:none;cursor:not-allowed;}",
    "#send-btn svg{width:18px;height:18px;color:#ffffff;}",

    "#chat-footer{",
    "padding:7px 0 9px;text-align:center;font-size:10.5px;",
    "color:#94a3b8;letter-spacing:.03em;flex-shrink:0;",
    "background:#ffffff;border-top:1px solid #f1f5f9;",
    'font-family:"Inter",system-ui,sans-serif;',
    "}",
    "#chat-footer a{color:var(--rm-trip-brand);font-weight:800;text-decoration:none;}",
    "#chat-footer a:hover{text-decoration:underline;}",

    ".msg.bot p{margin:0 0 6px;}",
    ".msg.bot p:last-child{margin-bottom:0;}",
    ".msg.bot ul,.msg.bot ol{margin:4px 0 6px 18px;padding:0;}",
    ".msg.bot li{margin-bottom:3px;}",
    ".msg.bot code{",
    "background:#eff6ff;border:1px solid #bfdbfe;",
    "border-radius:6px;padding:2px 6px;font-size:12px;",
    'font-family:"Geist",monospace;',
    "color:var(--rm-trip-brand);",
    "}",
    ".msg.bot pre{",
    "background:#f8fafc;border:1px solid #e5e7eb;",
    "border-radius:12px;padding:12px 14px;overflow-x:auto;margin:6px 0;",
    "}",
    ".msg.bot pre code{background:none;border:none;padding:0;color:#1f2937;font-size:12px;}",
    ".msg.bot strong{font-weight:800;color:#111827;}",
    ".msg.bot em{font-style:italic;color:var(--rm-trip-brand);}",
    ".msg.bot a{color:var(--rm-trip-brand);text-decoration:none;border-bottom:1px solid rgba(37,99,235,.25);}",
    ".msg.bot a:hover{border-color:var(--rm-trip-brand);}",
    ".msg.bot hr{border:none;border-top:1px solid #e5e7eb;margin:8px 0;}",
    ".msg.bot h1,.msg.bot h2,.msg.bot h3{",
    'font-family:"Geist",system-ui,sans-serif;',
    "font-weight:800;margin:8px 0 4px;color:#111827;letter-spacing:-.02em;",
    "}",
    ".msg.bot h1{font-size:1.12em;}",
    ".msg.bot h2{font-size:1.06em;}",
    ".msg.bot h3{font-size:1em;}",
    ".msg.bot table{border-collapse:collapse;font-size:12px;margin:6px 0;width:100%;}",
    ".msg.bot th,.msg.bot td{border:1px solid #e5e7eb;padding:6px 10px;text-align:left;}",
    ".msg.bot th{",
    "background:#eff6ff;font-weight:800;color:var(--rm-trip-brand);",
    "font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;",
    "}",
    ".msg.bot blockquote{",
    "border-left:3px solid var(--rm-trip-brand);",
    "margin:6px 0;padding:7px 12px;",
    "color:#475569;background:#eff6ff;border-radius:0 10px 10px 0;",
    "}",

    "@media(max-width:768px){",
    "#toggle-btn{right:18px;bottom:18px;width:58px;height:58px;}",
    "#toggle-btn.open{display:none;}",
    "#chat-window{inset:0;width:100vw;max-width:none;height:100vh;height:100dvh;max-height:none;border-radius:0;border:none;transform-origin:center;}",
    "#chat-window.hidden{transform:translateY(100%);}",
    ":host(.compbot-page-mode) #toggle-btn.open{display:none;}",
    ":host(.compbot-page-mode) #chat-window{inset:0;width:100vw;max-width:none;height:100vh;height:100dvh;max-height:none;border-radius:0;border:none;transform:none;transform-origin:center;}",
    ":host(.compbot-page-mode) #chat-window.hidden{transform:translateY(100%);}",
    "#chat-header{padding-top:calc(18px + env(safe-area-inset-top));}",
    "#messages{padding:14px 12px;}",
    "#input-row{padding:12px max(12px,env(safe-area-inset-right)) 12px max(12px,env(safe-area-inset-left));}",
    "#chat-footer{padding-bottom:calc(9px + env(safe-area-inset-bottom));}",
    "}"
  ].join("");

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
    chatWindow.appendChild(inputRow);
    chatWindow.appendChild(footer);
    messages.appendChild(suggestionsEl);

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

    function addRedirectFallback(url) {
      var el = document.createElement("div");
      var link = document.createElement("a");

      el.className = "msg bot";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Open page";

      el.appendChild(link);
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

      if (hasSentMessage || !widgetSuggestions.length) {
        suggestionsEl.classList.remove("visible");
        return;
      }

      widgetSuggestions.slice(0, 3).forEach(function (suggestion) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "suggestion-btn";
        btn.textContent = suggestion;
        btn.title = suggestion;
        btn.addEventListener("click", function () {
          userInput.value = suggestion;
          userInput.focus();
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

    function closeChat() {
      if (alwaysOpen) {
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
    function sendMessage() {
      var text = userInput.value.trim();

      if (!text || isLoading) {
        return;
      }

      userInput.value = "";
      hasSentMessage = true;
      renderSuggestions();

      addMessage(text, "user");

      setLoading(true);
      showTyping();

      fetch(apiBase + "/widget/" + widgetKey + "/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId
        })
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
            data.answer || data.response || data.message || "No response";

          addMessage(reply, "bot");

          if (
            data.action &&
            data.action.type === "redirect" &&
            data.action.url
          ) {
            setTimeout(function () {
              var opened = window.open(data.action.url, "_blank", "noopener");

              if (!opened) {
                addRedirectFallback(data.action.url);
              }
            }, Number(data.action.delayMs || 1200));
          }
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
