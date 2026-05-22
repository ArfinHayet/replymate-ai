import { type FormEvent, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Funnel,
  GitBranch,
  Languages,
  Lock,
  Minus,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

/* --------------------------- data --------------------------- */
type ContactFormState = { name: string; email: string; subject: string; message: string };
const CONTACT_EMAIL = "support@replymate.ai";

const workflowSteps = [
  {
    title: "Add business knowledge",
    desc: "Upload PDFs, markdown files, web pages, and images so answers are grounded in approved sources.",
  },
  {
    title: "Configure your workspace",
    desc: "Set company profile context, review content sources, and prepare widget keys and allowed domains.",
  },
  {
    title: "Deploy and improve",
    desc: "Embed the widget or share a public chat URL, then monitor analytics and chat history to keep improving.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    subtitle: "per month - for getting started.",
    features: [
      { label: "10 documents", included: true },
      { label: "1 website", included: true },
      { label: "10 photos", included: true },
      { label: "100 messages", included: true },
      { label: "Chatbot customization", included: false },
      { label: "Priority support", included: false },
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$20 USD",
    subtitle: "per month - for growing teams.",
    features: [
      { label: "100 document uploads", included: true },
      { label: "10 websites", included: true },
      { label: "200 photos", included: true },
      { label: "Unlimited chatting", included: true },
      { label: "Chatbot customization", included: true },
      { label: "Priority support", included: true },
    ],
    highlighted: true,
  },
];

const faqs = [
  {
    q: "How fast can we launch?",
    a: "Most teams can upload content, generate a widget key, and embed SupportMate on their site in a single afternoon.",
  },
  {
    q: "What content can we train it with?",
    a: "SupportMate supports PDFs, markdown files, website URLs, and images so your assistant can answer from your own material.",
  },
  {
    q: "Can we control where the widget runs?",
    a: "Yes. You can manage widget keys and set allowed domains so only approved origins can load your assistant.",
  },
  {
    q: "How do we improve response quality over time?",
    a: "Use chat history and analytics to review conversations, add missing sources, and refresh indexed web pages.",
  },
];

/* --------------------------- styles --------------------------- */
const css = `
/* -- reset & root ------------------------------------------- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  /* Your exact brand tokens */
  --brand:          var(--rm-trip-brand);
  --brand-dark:     var(--rm-trip-brand-dark);
  --brand-light:    var(--rm-trip-brand-light);
  --brand-glow:     rgba(37,99,235,0.22);

  --teal:           var(--rm-trip-accent);
  --teal-light:     var(--rm-trip-accent-light);

  --surface:        var(--rm-trip-surface);
  --surface-card:   var(--rm-trip-surface-card);
  --border:         rgba(15,23,42,0.10);
  --border-strong:  rgba(15,23,42,0.16);

  --text:           var(--rm-trip-text);
  --text-muted:     var(--rm-trip-text-muted);
  --text-faint:     #94a3b8;

  --success:        var(--rm-trip-state-success);
  --error:          var(--rm-trip-state-error);

  /* light hero palette */
  --hero-bg:        #f8fbff;
  --hero-card:      #ffffff;
  --hero-border:    rgba(15,23,42,0.10);
  --hero-text:      #0f172a;
  --hero-muted:     #64748b;

  --radius-sm:   var(--rm-trip-smooth);
  --radius:      calc(var(--rm-trip-smooth) + 6px);
  --radius-lg:   calc(var(--rm-trip-smooth) + 12px);
  --radius-pill: var(--rm-trip-pill);

  --shadow-xs:   var(--rm-trip-card-shadow);
  --shadow-sm:   var(--rm-trip-card-shadow);
  --shadow-md:   var(--rm-trip-lift-shadow);
  --shadow-lg:   var(--rm-trip-lift-shadow);
  --shadow-brand:var(--rm-trip-glow-shadow);

  --font-display: var(--rm-trip-font-heading);
  --font-body:    var(--rm-trip-font-body);
}

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-body);
  background: var(--surface);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* -- HEADER -------------------------------------------------- */
.nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(20px) saturate(200%);
  -webkit-backdrop-filter: blur(20px) saturate(200%);
  border-bottom: 1px solid var(--border);
}
.nav-inner {
  max-width: 1180px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  height: 62px; padding: 0 28px;
  gap: 16px;
}
.logo { display: flex; align-items: center; gap: 9px; text-decoration: none; flex-shrink: 0; min-width: 0; }
.logo-mark {
  width: 34px; height: 34px; border-radius: 10px;
  display: block;
  object-fit: contain;
  box-shadow: var(--shadow-brand);
}
.logo-name { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; white-space: nowrap; }

.nav-links { display: flex; align-items: center; gap: 0; }
@media (max-width: 860px) { .nav-links { display: none; } }
.nav-links a {
  padding: 6px 13px; border-radius: var(--radius-sm);
  font-size: 13.5px; font-weight: 500; color: var(--text-muted);
  text-decoration: none; transition: all 0.14s; white-space: nowrap;
}
.nav-links a:hover { background: var(--surface); color: var(--text); }

.nav-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.btn-ghost {
  padding: 7px 15px; border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong); background: #fff;
  font-size: 13.5px; font-weight: 600; color: var(--text);
  text-decoration: none; transition: all 0.14s; cursor: pointer;
  font-family: var(--font-body);
}
.btn-ghost:hover { background: var(--surface); }
.btn-primary {
  padding: 7px 16px; border-radius: var(--radius-sm);
  background: var(--brand); color: #fff; border: none;
  font-size: 13.5px; font-weight: 600; letter-spacing: -0.1px;
  text-decoration: none; transition: all 0.14s; cursor: pointer;
  font-family: var(--font-body); box-shadow: var(--shadow-brand);
}
.btn-primary:hover { background: var(--brand-dark); }
@media (max-width: 700px) {
  .nav-inner { height: 58px; padding: 0 14px; gap: 10px; }
  .logo-name { font-size: 16px; }
  .nav-actions { margin-left: auto; gap: 6px; }
  .btn-ghost { padding: 6px 10px; font-size: 12px; }
  .btn-primary { padding: 6px 11px; font-size: 12px; white-space: nowrap; }
}
@media (max-width: 560px) {
  .btn-ghost { display: none; }
  .btn-primary { padding: 6px 10px; font-size: 11.5px; }
}

/* -- HERO ----------------------------------------------------- */
.hero {
  background: var(--hero-bg);
  position: relative; overflow: hidden;
}
/* animated mesh orbs */
.hero::before {
  content: '';
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 70% 55% at 15% 25%, rgba(37,99,235,0.16) 0%, transparent 55%),
    radial-gradient(ellipse 45% 40% at 90% 10%, rgba(20,184,166,0.12) 0%, transparent 45%),
    radial-gradient(ellipse 50% 60% at 55% 95%, rgba(37,99,235,0.10) 0%, transparent 50%);
}
/* dot grid */
.hero::after {
  content: '';
  position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(rgba(15,23,42,0.06) 1px, transparent 1px);
  background-size: 28px 28px;
}
.hero-inner {
  position: relative; z-index: 1;
  max-width: 1180px; margin: 0 auto; padding: 88px 28px 96px;
  display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 60px;
}
@media (max-width: 900px) {
  .hero-inner { grid-template-columns: 1fr; padding: 64px 20px 72px; gap: 48px; }
}

.hero-badge {
  display: inline-flex; align-items: center; gap: 6px; margin-bottom: 22px;
  padding: 5px 13px; border-radius: var(--radius-pill);
  background: var(--brand-light); border: 1px solid rgba(37,99,235,0.28);
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--brand);
}
.hero-badge svg { color: var(--brand); }

.hero-h1 {
  font-family: var(--font-display);
  font-size: clamp(40px, 5.2vw, 62px);
  font-weight: 800; line-height: 1.06; letter-spacing: -1px;
  color: var(--hero-text); margin-bottom: 22px;
}
.hero-h1 .accent { color: #60a5fa; }

.hero-sub {
  font-size: 17px; line-height: 1.7; color: var(--hero-muted);
  font-weight: 400; max-width: 500px; margin-bottom: 36px;
}

.hero-ctas { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 44px; }
.hero-btn-main {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 13px 24px; border-radius: var(--radius-sm);
  background: var(--brand); color: #fff; border: none;
  font-family: var(--font-body); font-size: 15px; font-weight: 600;
  text-decoration: none; cursor: pointer; transition: all 0.18s;
  box-shadow: 0 0 0 0 var(--brand-glow), var(--shadow-brand);
}
.hero-btn-main:hover {
  background: var(--brand-dark);
  box-shadow: 0 0 32px var(--brand-glow), var(--shadow-brand);
  transform: translateY(-1px);
}
.hero-btn-outline {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 13px 22px; border-radius: var(--radius-sm);
  background: #fff; border: 1px solid var(--border-strong); color: var(--text);
  font-family: var(--font-body); font-size: 15px; font-weight: 500;
  text-decoration: none; cursor: pointer; transition: all 0.16s;
}
.hero-btn-outline:hover { background: var(--surface); border-color: var(--brand-light); }

.hero-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.hero-stat {
  background: #fff; border: 1px solid var(--hero-border);
  border-radius: var(--radius-sm); padding: 14px 16px;
  box-shadow: var(--shadow-xs);
}
.hero-stat strong { display: block; font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--hero-text); letter-spacing: -0.5px; }
.hero-stat span { font-size: 11.5px; color: var(--hero-muted); font-weight: 500; }

/* chat card in hero */
.chat-card {
  background: var(--hero-card); border: 1px solid var(--hero-border);
  border-radius: var(--radius); box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.chat-card-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; border-bottom: 1px solid var(--hero-border);
}
.online-dot {
  width: 9px; height: 9px; border-radius: 50%; background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34,197,94,0.18), 0 0 10px rgba(34,197,94,0.35);
  animation: pulse-green 2s ease-in-out infinite;
}
@keyframes pulse-green {
  0%,100% { box-shadow: 0 0 0 3px rgba(34,197,94,0.18), 0 0 8px rgba(34,197,94,0.3); }
  50%      { box-shadow: 0 0 0 5px rgba(34,197,94,0.12), 0 0 14px rgba(34,197,94,0.4); }
}
.chat-card-head-text p:first-child { font-size: 13.5px; font-weight: 600; color: var(--hero-text); }
.chat-card-head-text p:last-child  { font-size: 11.5px; color: var(--hero-muted); }
.chat-msgs {
  padding: 16px; display: flex; flex-direction: column; gap: 10px;
  background: var(--surface);
}
.msg-bot {
  max-width: 88%; background: #fff; border: 1px solid var(--hero-border);
  border-radius: 12px 12px 12px 4px; padding: 10px 14px;
  font-size: 13.5px; color: var(--text); line-height: 1.5;
}
.msg-user {
  max-width: 88%; align-self: flex-end;
  background: var(--brand); color: #fff;
  border-radius: 12px 12px 4px 12px; padding: 10px 14px;
  font-size: 13.5px; line-height: 1.5; font-weight: 500;
}
.msg-tag {
  max-width: 88%; background: var(--brand-light); border: 1px solid rgba(37,99,235,0.28);
  border-radius: 12px 12px 12px 4px; padding: 10px 14px;
  font-size: 13px; color: var(--brand); font-weight: 600;
}
.chat-input-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-top: 1px solid var(--hero-border);
  font-size: 13px; color: var(--text-muted);
}
.intent-badge {
  position: absolute; left: -18px; top: 32px;
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 8px 13px; box-shadow: var(--shadow-md);
}
.intent-badge .ib-label { font-size: 11px; font-weight: 600; color: var(--text-faint); display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
.intent-badge .ib-value { font-size: 13px; font-weight: 700; color: var(--brand); }

/* fade-up animation */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
.hero-left > * { animation: fadeUp 0.55s cubic-bezier(.22,.68,0,1.2) backwards; }
.hero-left > *:nth-child(1) { animation-delay: 0.06s; }
.hero-left > *:nth-child(2) { animation-delay: 0.14s; }
.hero-left > *:nth-child(3) { animation-delay: 0.22s; }
.hero-left > *:nth-child(4) { animation-delay: 0.30s; }
.hero-left > *:nth-child(5) { animation-delay: 0.38s; }
.hero-right { animation: fadeUp 0.55s cubic-bezier(.22,.68,0,1.2) 0.32s backwards; }

/* -- METRICS STRIP ------------------------------------------- */
.metrics-strip {
  background: #fff; border-bottom: 1px solid var(--border);
}
.metrics-inner {
  max-width: 1180px; margin: 0 auto;
  display: grid; grid-template-columns: repeat(4,1fr);
  background: var(--border);
  gap: 1px;
}
.metric-cell {
  background: #fff; padding: 22px 28px; text-align: center;
}
.metric-cell strong {
  display: block; font-family: var(--font-display);
  font-size: 26px; font-weight: 800; letter-spacing: -0.8px; color: var(--text);
}
.metric-cell span { font-size: 12px; color: var(--text-muted); font-weight: 500; margin-top: 2px; display: block; }
@media (max-width: 700px) { .metrics-inner { grid-template-columns: repeat(2,1fr); } }

/* -- INTEGRATIONS -------------------------------------------- */
.integrations-bar {
  max-width: 1180px; margin: 0 auto;
  padding: 28px 28px; display: flex; align-items: center; flex-wrap: wrap; gap: 14px;
}
.integrations-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-faint); margin-right: 4px; }
.int-pill {
  padding: 6px 15px; border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong); background: #fff;
  font-size: 13px; font-weight: 600; color: var(--text-muted);
  transition: all 0.14s; cursor: default;
}
.int-pill:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-light); }

/* -- SECTION SCAFFOLDING ------------------------------------- */
.section { max-width: 1180px; margin: 0 auto; padding: 80px 28px; }
.section-white { background: #fff; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }

.eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--brand); margin-bottom: 10px; }
.eyebrow-center { text-align: center; }
.section-h2 {
  font-family: var(--font-display); font-size: clamp(28px, 3.5vw, 40px);
  font-weight: 800; letter-spacing: -0.5px; line-height: 1.1; color: var(--text);
}
.section-sub { font-size: 16px; line-height: 1.68; color: var(--text-muted); font-weight: 300; max-width: 540px; margin-top: 12px; }

/* -- SCREENSHOTS --------------------------------------------- */
.screenshots-flow {
  margin-top: 36px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.ss-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: stretch;
}
.ss-media {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
}
.ss-media:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.ss-media img {
  width: 100%;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  display: block;
}
.ss-copy {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px 26px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.ss-step {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--brand);
  background: var(--brand-light);
  border: 1px solid rgba(37,99,235,0.25);
  border-radius: var(--radius-pill);
  padding: 4px 10px;
  margin-bottom: 8px;
}
.ss-copy h3 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.35px;
  margin-bottom: 8px;
  color: var(--text);
}
.ss-copy p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
}
.ss-row.reverse .ss-copy { order: 1; }
.ss-row.reverse .ss-media { order: 2; }
@media (max-width: 900px) {
  .ss-row { grid-template-columns: 1fr; }
  .ss-row.reverse .ss-copy, .ss-row.reverse .ss-media { order: initial; }
  .ss-copy { padding: 20px; }
  .ss-copy h3 { font-size: 21px; }
}

/* -- WORKFLOW ------------------------------------------------ */
.workflow-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-top: 40px; }
@media (max-width: 768px) { .workflow-grid { grid-template-columns: 1fr; } }
.wf-card {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 28px 26px; box-shadow: var(--shadow-sm); position: relative; overflow: hidden;
  transition: all 0.18s;
}
.wf-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.wf-card::after {
  content: '';
  position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--brand), #3b82f6);
  transform: scaleX(0); transform-origin: left; transition: transform 0.22s;
}
.wf-card:hover::after { transform: scaleX(1); }
.wf-num {
  font-family: var(--font-display); font-size: 52px; font-weight: 800;
  color: var(--brand-light); line-height: 1; letter-spacing: -2px; margin-bottom: 10px;
}
.wf-h { font-family: var(--font-display); font-size: 17px; font-weight: 700; letter-spacing: -0.2px; margin-bottom: 8px; }
.wf-p { font-size: 13.5px; line-height: 1.65; color: var(--text-muted); font-weight: 400; }

/* -- FEATURES ------------------------------------------------ */
.features-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
@media (max-width: 900px) { .features-grid { grid-template-columns: 1fr; } }
.feat-card {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 28px; box-shadow: var(--shadow-sm); transition: all 0.18s;
}
.feat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.feat-icon {
  width: 44px; height: 44px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
}
.fi-blue { background: var(--brand-light); color: var(--brand); }
.fi-teal { background: var(--teal-light); color: #0f766e; }
.feat-h { font-family: var(--font-display); font-size: 17px; font-weight: 700; margin-bottom: 14px; letter-spacing: -0.2px; }
.check-list { list-style: none; display: flex; flex-direction: column; gap: 9px; }
.check-list li { display: flex; align-items: flex-start; gap: 8px; font-size: 13.5px; color: var(--text-muted); }
.ci-blue { color: var(--brand); flex-shrink: 0; margin-top: 1px; }
.ci-teal { color: #0f766e; flex-shrink: 0; margin-top: 1px; }
.plat-list { list-style: none; display: flex; flex-direction: column; gap: 11px; }
.plat-list li { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--text-muted); }
.plat-list .pi { color: var(--brand); flex-shrink: 0; }

/* -- COMMAND CENTER ------------------------------------------ */
.cmd-grid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 48px; align-items: center; }
@media (max-width: 900px) { .cmd-grid { grid-template-columns: 1fr; } }
.cmd-points { display: flex; flex-direction: column; gap: 11px; margin-top: 22px; }
.cmd-pt { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-muted); }
.cmd-pt svg { color: var(--brand); flex-shrink: 0; }
.live-panel {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow-sm);
}
.live-header {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 11px 14px; margin-bottom: 14px;
}
.status-pill {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: var(--success);
}
.status-dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--success);
  animation: pulse-green 2s infinite;
}
.live-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 0; border-bottom: 1px solid var(--border);
  font-size: 13.5px;
}
.live-row:last-child { border: none; }
.live-row span { color: var(--text-muted); }
.live-row strong { font-weight: 700; font-family: var(--font-display); font-size: 15px; }

/* -- TESTIMONIALS -------------------------------------------- */
.test-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 32px; align-items: start; }
@media (max-width: 900px) { .test-grid { grid-template-columns: 1fr; } }
.quote-card {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 24px; box-shadow: var(--shadow-sm);
}
.quote-card blockquote {
  font-size: 15px; line-height: 1.72; color: var(--text-muted);
  font-weight: 300; margin-bottom: 14px; font-style: italic;
}
.quote-card cite { font-size: 13px; font-weight: 700; font-style: normal; color: var(--text); }
.stats-panel {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 10px;
}
.stat-block {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 16px;
}
.stat-block.hi { background: var(--brand-light); border-color: rgba(37,99,235,0.2); }
.stat-block .sbl { font-size: 11px; font-weight: 600; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.07em; }
.stat-block.hi .sbl { color: rgba(37,99,235,0.6); }
.stat-block .sbv { font-family: var(--font-display); font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-top: 4px; }
.stat-block.hi .sbv { color: var(--brand); }

/* -- TRUST ROW ----------------------------------------------- */
.trust-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
@media (max-width: 700px) { .trust-grid { grid-template-columns: 1fr; } }
.trust-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px;
  transition: all 0.16s;
}
.trust-card:hover { background: #fff; box-shadow: var(--shadow-sm); }
.trust-card svg { color: var(--brand); }
.trust-card h4 { font-family: var(--font-display); font-size: 14px; font-weight: 700; margin: 10px 0 5px; }
.trust-card p { font-size: 12.5px; color: var(--text-muted); line-height: 1.55; }

/* -- PRICING ------------------------------------------------- */
.pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }
@media (max-width: 700px) { .pricing-grid { grid-template-columns: 1fr; } }
.plan-card {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 30px; box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; height: 100%;
}
.plan-card.featured {
  background: #fff;
  border: 2px solid var(--brand);
  box-shadow: 0 16px 40px rgba(37,99,235,0.22);
  transform: translateY(-4px);
  position: relative;
}
.plan-card.featured::before {
  content: "Most popular";
  position: absolute;
  top: -12px;
  right: 20px;
  background: var(--brand);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 5px 11px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.plan-name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); margin-bottom: 8px; }
.plan-card.featured .plan-name { color: var(--brand); }
.plan-price {
  font-family: var(--font-display); font-size: 56px; font-weight: 800; line-height: 1;
  letter-spacing: -2px; color: var(--text); margin-bottom: 6px;
}
.plan-card.featured .plan-price { color: var(--brand); }
.plan-sub { font-size: 13px; color: var(--text-faint); margin-bottom: 24px; font-weight: 400; }
.plan-card.featured .plan-sub { color: var(--text-muted); }
.plan-feats { list-style: none; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.plan-feats li { display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: var(--text-muted); }
.plan-feats li.unavailable {
  color: var(--text-faint);
  text-decoration: line-through;
  text-decoration-thickness: 1.25px;
}
.plan-feats .ck { color: var(--brand); flex-shrink: 0; }
.plan-feats li.unavailable .ck { color: var(--text-faint); }
.plan-cta {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; margin-top: 24px; padding: 11px;
  border-radius: var(--radius-sm); font-family: var(--font-body);
  font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none;
  transition: all 0.16s; border: none;
}
.plan-cta-outline {
  background: transparent; border: 1px solid var(--border-strong); color: var(--text);
}
.plan-cta-outline:hover { background: var(--surface); }
.plan-cta-solid {
  background: var(--brand); border: 1px solid var(--brand); color: #fff;
}
.plan-cta-solid:hover { background: var(--brand-dark); border-color: var(--brand-dark); }

.pricing-mini { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
@media (max-width: 900px) { .pricing-mini { grid-template-columns: repeat(2,1fr); } }
.pmini {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 18px; box-shadow: var(--shadow-xs);
}
.pmini svg { color: var(--brand); }
.pmini h4 { font-family: var(--font-display); font-size: 13.5px; font-weight: 700; margin: 10px 0 4px; }
.pmini p { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

/* -- FAQ ----------------------------------------------------- */
.faq-list { display: flex; flex-direction: column; gap: 10px; margin-top: 32px; }
.faq-item {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;
  transition: box-shadow 0.16s;
}
.faq-item[open] { box-shadow: var(--shadow-sm); }
.faq-item summary {
  list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center;
  padding: 18px 22px; font-size: 15px; font-weight: 600; user-select: none;
}
.faq-item summary::-webkit-details-marker { display: none; }
.faq-chevron { font-size: 18px; color: var(--brand); font-weight: 300; line-height: 1; }
.faq-item[open] .faq-open { display: none; }
.faq-item:not([open]) .faq-close { display: none; }
.faq-answer { padding: 0 22px 18px; font-size: 14px; line-height: 1.72; color: var(--text-muted); font-weight: 300; }

/* -- CTA SECTION --------------------------------------------- */
.cta-wrap { max-width: 1180px; margin: 0 auto; padding: 64px 28px 80px; }
.cta-box {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg); overflow: hidden;
  display: grid; grid-template-columns: 1.4fr 1fr;
}
@media (max-width: 900px) { .cta-box { grid-template-columns: 1fr; } }
.cta-left { padding: 40px; min-width: 0; }
.cta-right { background: var(--surface); border-left: 1px solid var(--border); padding: 32px; min-width: 0; }
@media (max-width: 900px) { .cta-right { border-left: none; border-top: 1px solid var(--border); } }
.cta-h { font-family: var(--font-display); font-size: 30px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px; }
.cta-sub { font-size: 14px; line-height: 1.65; color: var(--text-muted); margin-bottom: 26px; font-weight: 300; max-width: 420px; }

/* form */
.rm-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.rm-field label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 5px; color: var(--text); }
.rm-field.span-2 { grid-column: 1/-1; }
.rm-input {
  width: 100%; padding: 10px 13px; border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong); background: var(--surface);
  font-size: 13.5px; color: var(--text); font-family: var(--font-body);
  outline: none; transition: all 0.14s;
}
.rm-textarea { min-height: 120px; resize: vertical; }
.rm-input:focus {
  border-color: var(--brand); background: #fff;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
}
.rm-input::placeholder { color: var(--text-faint); }
.btn-submit {
  grid-column: 1/-1; display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 13px; border-radius: var(--radius-sm); background: var(--brand); color: #fff;
  font-family: var(--font-body); font-size: 15px; font-weight: 600; border: none;
  cursor: pointer; transition: all 0.18s; box-shadow: var(--shadow-brand);
}
.btn-submit:hover:not(:disabled) {
  background: var(--brand-dark); transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(37,99,235,0.35);
}
.btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }

.form-links { display: flex; gap: 20px; margin-top: 12px; flex-wrap: wrap; }
.form-links a { font-size: 13px; font-weight: 600; color: var(--brand); text-decoration: none; }
.form-links a:hover { text-decoration: underline; }
.form-links .muted { color: var(--text-muted); }
.msg-error   { font-size: 13px; font-weight: 600; color: var(--error); margin-top: 10px; }
.msg-success { font-size: 13px; font-weight: 600; color: var(--success); margin-top: 10px; }
@media (max-width: 700px) {
  .cta-wrap { padding: 48px 14px 64px; }
  .cta-left { padding: 28px 20px; }
  .cta-right { padding: 24px 20px; }
  .cta-h { font-size: 24px; }
  .rm-form { grid-template-columns: 1fr; }
  .rm-field.span-2 { grid-column: auto; }
}

.preview-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-faint); margin-bottom: 14px; }
.preview-msg { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 13px 15px; margin-bottom: 10px; }
.preview-msg .pl { font-size: 11px; font-weight: 600; color: var(--text-faint); margin-bottom: 4px; }
.preview-msg .pt { font-size: 13.5px; color: var(--text); line-height: 1.5; word-break: break-word; }
.preview-action { background: var(--brand-light); border: 1px solid rgba(37,99,235,0.2); border-radius: var(--radius-sm); padding: 13px 15px; margin-bottom: 10px; }
.preview-action .pl { font-size: 11px; font-weight: 600; color: rgba(37,99,235,0.6); margin-bottom: 4px; }
.preview-action .pt { font-size: 14px; font-weight: 700; color: var(--brand); }
.preview-trust { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 11px 14px; display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-muted); font-weight: 500; }

/* -- FOOTER -------------------------------------------------- */
.footer { background: #fff; border-top: 1px solid var(--border); }
.footer-inner {
  max-width: 1180px; margin: 0 auto;
  display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr;
  gap: 32px; padding: 52px 28px 40px;
}
@media (max-width: 768px) { .footer-inner { grid-template-columns: 1fr 1fr; } }
.footer-brand p { font-size: 13.5px; color: var(--text-muted); margin-top: 12px; font-weight: 300; }
.footer-col h5 { font-family: var(--font-display); font-size: 13px; font-weight: 700; margin-bottom: 14px; }
.footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
.footer-col a { font-size: 13px; color: var(--text-muted); text-decoration: none; transition: color 0.13s; }
.footer-col a:hover { color: var(--text); }
.footer-col .wi { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-muted); }
.footer-col .wi svg { flex-shrink: 0; }
.footer-bottom {
  border-top: 1px solid var(--border); padding: 16px 28px;
  max-width: 1180px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; color: var(--text-faint);
}
`;

/* --------------------------- component --------------------------- */
export function LandingPage() {
  const [form, setForm] = useState<ContactFormState>({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const messagePreview = useMemo(() => {
    const content = form.message.trim();
    if (!content) return "Tell us what you need help with and we will respond by email.";
    return content.length > 180 ? `${content.slice(0, 177)}...` : content;
  }, [form.message]);

  function set<K extends keyof ContactFormState>(k: K, v: ContactFormState[K]) {
    setForm((c) => ({ ...c, [k]: v }));
    setError(null);
    setSuccess(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      return setError("Please fill in your name, email, and message.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setError("Please enter a valid email address.");
    }
    const subject = form.subject.trim() || "New contact request from SupportMate landing page";
    const body = [`Name: ${form.name.trim()}`, `Email: ${form.email.trim()}`, "", form.message.trim()].join("\n");

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 300));
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSuccess(`Thanks ${form.name.split(" ")[0] || "there"}. Your contact request is ready to send.`);
    setSubmitting(false);
    setForm({ name: "", email: "", subject: "", message: "" });
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* -- NAV -- */}
      <header className="nav">
        <div className="nav-inner">
          <a href="#" className="logo" aria-label="SupportMate home">
            <img src="/favicon.svg" alt="SupportMate logo" className="logo-mark" />
            <span className="logo-name">SupportMate</span>
          </a>
          <nav className="nav-links">
            <a href="#how">Workflow</a>
            <a href="#screenshots">Screenshots</a>
            <a href="#features">Features</a>
            <a href="#testimonials">Customers</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="nav-actions">
            <Link to="/login" className="btn-ghost">
              Sign in
            </Link>
            <a href="#cta" className="btn-primary">
              Book walkthrough
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* -- HERO -- */}
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-left">
              <div className="hero-badge">
                <Sparkles size={12} />
                AI support assistant for your knowledge base
              </div>
              <h1 className="hero-h1">
                A grounded AI assistant for your <span className="accent">support content</span>
              </h1>
              <p className="hero-sub">
                SupportMate answers from your approved documents and pages, powers your website widget, and gives your
                team full visibility with analytics and conversation history.
              </p>
              <div className="hero-ctas">
                <a href="#cta" className="hero-btn-main">
                  Get a workspace walkthrough <ArrowRight size={16} />
                </a>
                <a href="#screenshots" className="hero-btn-outline">
                  See the dashboard
                </a>
              </div>
              <div className="hero-stats">
                <div className="hero-stat">
                  <strong>4</strong>
                  <span>content types supported</span>
                </div>
                <div className="hero-stat">
                  <strong>1 script</strong>
                  <span>to embed your widget</span>
                </div>
                <div className="hero-stat">
                  <strong>Live</strong>
                  <span>analytics and chat history</span>
                </div>
              </div>
            </div>

            <div className="hero-right" style={{ position: "relative" }}>
              <div className="chat-card">
                <div className="chat-card-head">
                  <span className="online-dot" />
                  <div className="chat-card-head-text">
                    <p>SupportMate Assistant</p>
                    <p>Online now</p>
                  </div>
                </div>
                <div className="chat-msgs">
                  <div className="msg-bot">Hi, I can help using your uploaded docs and indexed website pages.</div>
                  <div className="msg-user">Can I add our help center and product PDFs?</div>
                  <div className="msg-bot">
                    Yes. Add URLs, PDFs, markdown, and images in Add Content, then ask questions from Chat.
                  </div>
                  <div className="msg-tag">Indexed source match: 5 sections</div>
                </div>
                <div className="chat-input-bar">
                  <span>Ask about your knowledge base...</span>
                  <Send size={14} color="var(--brand)" />
                </div>
              </div>
              <div className="intent-badge">
                <div className="ib-label">
                  <Zap size={11} color="var(--brand)" />
                  Source status
                </div>
                <div className="ib-value">Grounded answer</div>
              </div>
            </div>
          </div>
        </section>

        {/* -- METRICS -- */}
        <div className="metrics-strip">
          <div className="metrics-inner">
            <div className="metric-cell">
              <strong>PDF + Markdown</strong>
              <span>document ingestion</span>
            </div>
            <div className="metric-cell">
              <strong>Web Crawl</strong>
              <span>URL indexing and refetch</span>
            </div>
            <div className="metric-cell">
              <strong>Widget Keys</strong>
              <span>embed and domain control</span>
            </div>
            <div className="metric-cell">
              <strong>Analytics</strong>
              <span>sessions, sources, sections</span>
            </div>
          </div>
        </div>

        {/* -- INTEGRATIONS -- */}
        <div className="integrations-bar">
          <span className="integrations-label">Built for</span>
          {["PDFs", "Markdown", "Web Pages", "Images", "Website Widget"].map((n) => (
            <span key={n} className="int-pill">
              {n}
            </span>
          ))}
        </div>

        {/* -- SCREENSHOTS -- */}
        <section id="screenshots">
          <div className="section">
            <p className="eyebrow">Screenshots</p>
            <h2 className="section-h2">A practical workspace for support operations</h2>
            <p className="section-sub">
              Follow the same Z flow your team uses: upload trusted sources, monitor results in one dashboard, then
              refine workflows to improve every reply.
            </p>
            <div className="screenshots-flow">
              <article className="ss-row">
                <div className="ss-copy">
                  <span className="ss-step">Step 01</span>
                  <h3>Upload your content</h3>
                  <p>Add PDFs, markdown files, web pages, and images so answers stay grounded in your sources.</p>
                </div>
                <figure className="ss-media" style={{ margin: 0 }}>
                  <img src="/landing/screenshot-inbox.png" alt="SupportMate shared inbox with AI replies" />
                </figure>
              </article>
              <article className="ss-row reverse">
                <div className="ss-copy">
                  <span className="ss-step">Step 02</span>
                  <h3>Track performance live</h3>
                  <p>Use the dashboard to review sessions, content coverage, and where responses need improvement.</p>
                </div>
                <figure className="ss-media" style={{ margin: 0 }}>
                  <img src="/landing/screenshot-analytics.png" alt="Analytics dashboard" />
                </figure>
              </article>
              <article className="ss-row">
                <div className="ss-copy">
                  <span className="ss-step">Step 03</span>
                  <h3>Automate your workflows</h3>
                  <p>Route conversations and qualify leads with rules that turn insights into repeatable actions.</p>
                </div>
                <figure className="ss-media" style={{ margin: 0 }}>
                  <img src="/landing/screenshot-builder.png" alt="Workflow builder" />
                </figure>
              </article>
            </div>
          </div>
        </section>

        {/* -- WORKFLOW -- */}
        <div className="section-white" id="how">
          <div className="section">
            <p className="eyebrow">Workflow</p>
            <h2 className="section-h2">Set up, deploy, and improve in three clear steps</h2>
            <div className="workflow-grid">
              {workflowSteps.map((s, i) => (
                <article key={s.title} className="wf-card">
                  <div className="wf-num">0{i + 1}</div>
                  <h3 className="wf-h">{s.title}</h3>
                  <p className="wf-p">{s.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* -- FEATURES -- */}
        <section id="features">
          <div className="section">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <p className="eyebrow eyebrow-center">Features</p>
              <h2 className="section-h2" style={{ maxWidth: 540, margin: "0 auto" }}>
                Everything needed to run a grounded support assistant
              </h2>
            </div>
            <div className="features-grid">
              <article className="feat-card">
                <div className="feat-icon fi-blue">
                  <MessageCircle size={20} />
                </div>
                <h3 className="feat-h">Instant answer engine</h3>
                <ul className="check-list">
                  <li>
                    <Check size={15} className="ci-blue" />
                    Answers from approved content
                  </li>
                  <li>
                    <Check size={15} className="ci-blue" />
                    Chat against indexed documents and pages
                  </li>
                  <li>
                    <Check size={15} className="ci-blue" />
                    Clear context for manual follow-up
                  </li>
                </ul>
              </article>
              <article className="feat-card">
                <div className="feat-icon fi-teal">
                  <Funnel size={20} />
                </div>
                <h3 className="feat-h">Content pipeline</h3>
                <ul className="check-list">
                  <li>
                    <Check size={15} className="ci-teal" />
                    Upload PDFs, markdown, and images
                  </li>
                  <li>
                    <Check size={15} className="ci-teal" />
                    Ingest and refetch website URLs
                  </li>
                  <li>
                    <Check size={15} className="ci-teal" />
                    Edit and manage saved sources
                  </li>
                </ul>
              </article>
              <article className="feat-card">
                <h3 className="feat-h">Platform essentials</h3>
                <ul className="plat-list">
                  <li>
                    <ShieldCheck size={16} className="pi" />
                    Widget keys and allowed domains
                  </li>
                  <li>
                    <Languages size={16} className="pi" />
                    Public chatbot URL for quick sharing
                  </li>
                  <li>
                    <Activity size={16} className="pi" />
                    Conversation analytics
                  </li>
                  <li>
                    <GitBranch size={16} className="pi" />
                    Web crawl health and source mix
                  </li>
                  <li>
                    <Lock size={16} className="pi" />
                    Chat history review tools
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* -- COMMAND CENTER -- */}
        <div className="section-white">
          <div className="section">
            <div className="cmd-grid">
              <div>
                <p className="eyebrow">Command center</p>
                <h2 className="section-h2">Run your assistant from one operational workspace</h2>
                <p className="section-sub">
                  Manage content, monitor conversations, configure embed settings, and track performance from one
                  dashboard.
                </p>
                <div className="cmd-points">
                  <div className="cmd-pt">
                    <WandSparkles size={16} />
                    Grounded answers from indexed content
                  </div>
                  <div className="cmd-pt">
                    <GitBranch size={16} />
                    Widget snippet and public URL generation
                  </div>
                  <div className="cmd-pt">
                    <ShieldCheck size={16} />
                    Domain allowlist and key management
                  </div>
                </div>
              </div>
              <div className="live-panel">
                <div className="live-header">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-faint)" }}>Live operations</span>
                  <span className="status-pill">
                    <span className="status-dot" />
                    Healthy
                  </span>
                </div>
                <div className="live-row">
                  <span>Indexed sources</span>
                  <strong>126</strong>
                </div>
                <div className="live-row">
                  <span>Active widget keys</span>
                  <strong>8</strong>
                </div>
                <div className="live-row">
                  <span>Crawled pages</span>
                  <strong>412</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -- TESTIMONIALS -- */}
        <section id="testimonials">
          <div className="section">
            <div className="test-grid">
              <div>
                <p className="eyebrow">Customers</p>
                <h2 className="section-h2">Support teams move faster with better content control</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
                  <figure className="quote-card" style={{ margin: 0 }}>
                    <blockquote>
                      "We uploaded our docs and help center first, then SupportMate started answering with cleaner,
                      source-backed responses in the same day."
                    </blockquote>
                    <cite>Maya Chen - Support Lead</cite>
                  </figure>
                  <figure className="quote-card" style={{ margin: 0 }}>
                    <blockquote>
                      "Widget key and domain controls made rollout easy across our properties, and analytics shows
                      exactly where we still need better content."
                    </blockquote>
                    <cite>Eli Novak - Operations Manager</cite>
                  </figure>
                </div>
              </div>
              <div className="stats-panel">
                <div className="stat-block">
                  <div className="sbl">Indexed sections</div>
                  <div className="sbv">5,406</div>
                </div>
                <div className="stat-block">
                  <div className="sbl">Crawled pages</div>
                  <div className="sbv">1,284</div>
                </div>
                <div className="stat-block hi">
                  <div className="sbl">Conversations</div>
                  <div className="sbv">42,891</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -- TRUST -- */}
        <div className="section-white">
          <div className="section" style={{ paddingTop: 48, paddingBottom: 48 }}>
            <div className="trust-grid">
              <article className="trust-card">
                <Lock size={20} />
                <h4>Domain controls</h4>
                <p>Allow only approved origins to load your website widget.</p>
              </article>
              <article className="trust-card">
                <FileText size={20} />
                <h4>Approved sources</h4>
                <p>Ground responses in your uploaded and indexed business content.</p>
              </article>
              <article className="trust-card">
                <BarChart3 size={20} />
                <h4>Conversation visibility</h4>
                <p>Review chat history and analytics to improve answers continuously.</p>
              </article>
            </div>
          </div>
        </div>

        {/* -- PRICING -- */}
        <section id="pricing">
          <div className="section">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <p className="eyebrow eyebrow-center">Pricing</p>
              <h2 className="section-h2" style={{ maxWidth: 460, margin: "0 auto" }}>
                Choose a plan for your support volume
              </h2>
            </div>
            <div className="pricing-grid">
              {pricingPlans.map((p) => (
                <article key={p.name} className={`plan-card${p.highlighted ? " featured" : ""}`}>
                  <div className="plan-name">{p.name}</div>
                  <div className="plan-price">{p.price}</div>
                  <p className="plan-sub">{p.subtitle}</p>
                  <ul className="plan-feats">
                    {p.features.map((f) => (
                      <li key={f.label} className={f.included ? "" : "unavailable"}>
                        {f.included ? <Check size={15} className="ck" /> : <Minus size={15} className="ck" />}
                        {f.label}
                      </li>
                    ))}
                  </ul>
                  <a href="#cta" className={`plan-cta ${p.highlighted ? "plan-cta-solid" : "plan-cta-outline"}`}>
                    Get started <ChevronRight size={15} />
                  </a>
                </article>
              ))}
            </div>
            <div className="pricing-mini">
              <article className="pmini">
                <Clock3 size={18} />
                <h4>Always available</h4>
                <p>Keep your assistant active around the clock.</p>
              </article>
              <article className="pmini">
                <FileText size={18} />
                <h4>Knowledge grounded</h4>
                <p>Answer from docs, pages, markdown, and images.</p>
              </article>
              <article className="pmini">
                <Users size={18} />
                <h4>Workspace control</h4>
                <p>Manage company context, content, and widget keys.</p>
              </article>
              <article className="pmini">
                <BarChart3 size={18} />
                <h4>Actionable trends</h4>
                <p>Track activity, source mix, and crawl health.</p>
              </article>
            </div>
          </div>
        </section>

        {/* -- FAQ -- */}
        <div className="section-white">
          <div className="section">
            <p className="eyebrow">FAQ</p>
            <h2 className="section-h2">Questions before rollout</h2>
            <div className="faq-list">
              {faqs.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>
                    {item.q}
                    <span className="faq-chevron">
                      <span className="faq-open">+</span>
                      <span className="faq-close">-</span>
                    </span>
                  </summary>
                  <p className="faq-answer">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* -- CTA -- */}
        <section id="cta">
          <div className="cta-wrap">
            <div className="cta-box">
              <div className="cta-left">
                <h2 className="cta-h">Contact us</h2>
                <p className="cta-sub">Send us your questions and we will get back to you by email.</p>
                <form className="rm-form" onSubmit={onSubmit}>
                  <div className="rm-field">
                    <label>Name</label>
                    <input
                      className="rm-input"
                      type="text"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Alex Morgan"
                      required
                    />
                  </div>
                  <div className="rm-field">
                    <label>Email</label>
                    <input
                      className="rm-input"
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="alex@company.com"
                      required
                    />
                  </div>
                  <div className="rm-field span-2">
                    <label>Subject (optional)</label>
                    <input
                      className="rm-input"
                      type="text"
                      value={form.subject}
                      onChange={(e) => set("subject", e.target.value)}
                      placeholder="How can we help?"
                    />
                  </div>
                  <div className="rm-field span-2">
                    <label>Message</label>
                    <textarea
                      className="rm-input rm-textarea"
                      value={form.message}
                      onChange={(e) => set("message", e.target.value)}
                      placeholder="Write your message..."
                      required
                    />
                  </div>
                  <button type="submit" disabled={submitting} className="btn-submit">
                    {submitting ? "Submitting..." : "Send message"}
                    <ChevronRight size={16} />
                  </button>
                </form>
                <div className="form-links">
                  <Link to="/login">Already have an account? Sign in</Link>
                  <Link to="/signup" className="muted">
                    Create account
                  </Link>
                </div>
                {error && <p className="msg-error">{error}</p>}
                {success && <p className="msg-success">{success}</p>}
              </div>
              <div className="cta-right">
                <p className="preview-label">Contact preview</p>
                <div className="preview-msg">
                  <div className="pl">Your message</div>
                  <div className="pt">{messagePreview}</div>
                </div>
                <div className="preview-action">
                  <div className="pl">Reply destination</div>
                  <div className="pt">{form.email.trim() || "your-email@example.com"}</div>
                </div>
                <div className="preview-trust">
                  <ShieldCheck size={15} color="var(--brand)" />
                  Messages are prepared for {CONTACT_EMAIL}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* -- FOOTER -- */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo" style={{ pointerEvents: "none" }}>
              <img src="/favicon.svg" alt="SupportMate logo" className="logo-mark" />
              <span className="logo-name">SupportMate</span>
            </div>
            <p>Grounded AI support for modern teams.</p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
              <li>
                <a href="#cta">Book walkthrough</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <ul>
              <li className="wi">
                <Clock3 size={13} />
                24/7 assistant availability
              </li>
              <li className="wi">
                <Bot size={13} />
                Grounded answer engine
              </li>
              <li className="wi">
                <Users size={13} />
                Conversation history review
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Trust</h5>
            <ul>
              <li className="wi">
                <Lock size={13} />
                Chat history review tools
              </li>
              <li className="wi">
                <FileText size={13} />
                Approved source control
              </li>
              <li className="wi">
                <ShieldCheck size={13} />
                Widget domain allowlist
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SupportMate, Inc. All rights reserved.</span>
          <span>Privacy · Terms</span>
        </div>
      </footer>
    </>
  );
}


