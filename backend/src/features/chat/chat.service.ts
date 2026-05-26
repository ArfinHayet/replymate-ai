import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { ChatMessage } from './chat-message.entity';
import { AiService } from '../../core/ai/ai.service';
import { CacheService } from '../../core/cache/cache.service';
import { CompanyService } from '../company/company.service';
import { RetrievalService } from '../../core/retrieval/retrieval.service';
import { MessageUsageSnapshot, UsageService } from '../usage/usage.service';
import { ChatRedirectAction } from '../chat-tools/chat-tools.types';
import { ChatToolsService } from '../chat-tools/chat-tools.service';

/** Max stored messages loaded per session (10 full turns) */
const MAX_HISTORY = 20;
const RETRIEVAL_CONTEXT_TURNS = 6;
const RETRIEVAL_CONTEXT_CHAR_LIMIT = 1600;
const CLARIFICATION_MESSAGE = 'Which company or organization do you mean?';
const FALLBACK_MESSAGE =
  "That's outside the scope of what I can help with here. I'm only able to answer questions based on the available knowledge base - feel free to ask me anything related to it!";
const FOLLOW_UP_REFERENCE_PATTERN =
  /\b(their|there|it|its|they|them|that company|this company|that organization|this organization|that policy|this policy)\b/i;
const NAMED_ENTITY_MATCH_PATTERN =
  /[A-Z][A-Za-z0-9&.'-]*(?:[ \t]+[A-Z][A-Za-z0-9&.'-]*)+/g;
const ELLIPTICAL_FOLLOW_UP_PATTERN =
  /\b(contact|number|phone|mobile|call|helpline|whatsapp|email|address|location|office|hours|website|url|link|branch|price|cost|fare|rate|policy|terms|support)\b/i;
const SUBJECT_CUE_PATTERN =
  /\b(?:about|contact|for|with|called|named)\s+([a-z0-9&.'-]+(?:\s+[a-z0-9&.'-]+){1,5})/i;
const SUBJECT_SUFFIX_PATTERN =
  /\s+(overview|office location|office hours|contact information|contact number|phone numbers|email addresses|physical address|address|location|contact|information|recommendation|website|details|support)$/i;

type ProviderHistoryMessage = {
  role: 'user' | 'model';
  parts: { text?: string }[];
};

type SystemPromptContext = {
  prompt: string;
  activeCompanyName?: string;
};

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);

  private systemPrompt: string = '';
  private fallbackMessage: string = '';

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    private readonly config: ConfigService,
    private readonly aiService: AiService,
    private readonly cacheService: CacheService,
    private readonly companyService: CompanyService,
    private readonly retrievalService: RetrievalService,
    private readonly usageService: UsageService,
    private readonly chatToolsService: ChatToolsService,
  ) {}

  onModuleInit() {
    const promptPath = path.join(__dirname, 'prompts', 'system.prompt.txt');
    this.systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    // Extract fallback sentence from the prompt file so it stays in sync.
    const lines = this.systemPrompt.split('\n');
    const markerIdx = lines.findIndex((l) =>
      l.includes('respond with exactly this sentence'),
    );
    this.fallbackMessage =
      markerIdx !== -1 && lines[markerIdx + 1]
        ? lines[markerIdx + 1].trim()
        : FALLBACK_MESSAGE;

    this.logger.log('System prompt loaded');
  }

  private async buildSystemPrompt(userId: string): Promise<SystemPromptContext> {
    const company = await this.companyService.getActive(userId);
    console.log('Active company profile:', company, userId);
    const runtimeContext = this.buildRuntimeContextPrompt();
    if (!company) return { prompt: runtimeContext + this.systemPrompt };

    const name = company.name;
    const description = company.shortDescription;

    const persona = [
      `You are a support representative for ${name}.`,
      `Company overview: ${description}`,
      `IMPORTANT: If the user asks "who are you", "what are you", "introduce yourself", "tell me about yourself", or any similar identity question, you MUST respond with exactly this: "I'm a support assistant for ${name}. ${description} How can I help you today?" - do NOT call any tool for this.`,
      `When users ask about "your company", "what you do", "your services", or anything about ${name}, you MUST call search_documents("${name}") and search_web_pages("${name}") to retrieve detailed information before answering.`,
      '',
    ].join('\n');

    return {
      prompt: persona + '\n' + runtimeContext + this.systemPrompt,
      activeCompanyName: name,
    };
  }

  private buildRuntimeContextPrompt(): string {
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10);
    return `Runtime context:\nCurrent date: ${currentDate}\nCurrent year: ${now.getFullYear()}\n\n`;
  }

  private buildContextualRetrievalQuery(
    history: ProviderHistoryMessage[],
    message: string,
  ): string {
    const recentContext = history
      .slice(-RETRIEVAL_CONTEXT_TURNS)
      .map((m) => {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        const text = m.parts.map((p) => p.text ?? '').join('').trim();
        return text ? `${role}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n')
      .slice(-RETRIEVAL_CONTEXT_CHAR_LIMIT);

    return recentContext
      ? `Recent conversation:\n${recentContext}\n\nCurrent question: ${message}`
      : message;
  }

  private hasFollowUpReference(message: string): boolean {
    return FOLLOW_UP_REFERENCE_PATTERN.test(message);
  }

  private isEllipticalFollowUp(message: string): boolean {
    const cleaned = message.trim().replace(/[?!.\s]+$/g, '');
    if (!cleaned) return false;

    const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
    return wordCount <= 5 && ELLIPTICAL_FOLLOW_UP_PATTERN.test(cleaned);
  }

  private buildDeterministicRetrievalIntent(
    history: ProviderHistoryMessage[],
    message: string,
    activeCompanyName?: string,
  ): string | null {
    const isFollowUp =
      this.hasFollowUpReference(message) || this.isEllipticalFollowUp(message);
    if (!isFollowUp) return null;

    const subject =
      this.extractLatestSubject(history, 'user') ??
      this.extractLatestSubject(history, 'model') ??
      activeCompanyName ??
      null;
    if (!subject) return null;

    const keywords = this.expandFollowUpKeywords(message);
    return [subject, ...keywords].join(' ').replace(/\s+/g, ' ').trim();
  }

  private extractLatestSubject(
    history: ProviderHistoryMessage[],
    preferredRole: 'model' | 'user',
  ): string | null {
    const messages = history
      .filter((m) => m.role === preferredRole)
      .slice()
      .reverse();

    for (const message of messages) {
      const text = message.parts.map((p) => p.text ?? '').join(' ').trim();
      const subject = this.extractSubjectFromText(text);
      if (subject) return subject;
    }

    return null;
  }

  private extractSubjectFromText(text: string): string | null {
    const cueMatch = text.match(SUBJECT_CUE_PATTERN);
    if (cueMatch?.[1]) {
      const subject = this.cleanSubjectCandidate(cueMatch[1]);
      if (subject) return this.toTitleCase(subject);
    }

    const candidates = text.match(NAMED_ENTITY_MATCH_PATTERN) ?? [];
    for (const candidate of candidates) {
      const subject = this.cleanSubjectCandidate(candidate);
      if (subject) return subject;
    }

    return null;
  }

  private cleanSubjectCandidate(candidate: string): string | null {
    let subject = candidate
      .replace(/[#*_`[\]():|]/g, ' ')
      .replace(/\b(can|could|would|should|has|have|is|are|was|were|their|the|a|an)\b.*$/i, '')
      .replace(/[?!.,;:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    let previous: string;
    do {
      previous = subject;
      subject = subject.replace(SUBJECT_SUFFIX_PATTERN, '').trim();
    } while (subject !== previous);

    const words = subject.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 5) return null;
    if (!/[a-z0-9]/i.test(subject)) return null;

    return subject;
  }

  private toTitleCase(value: string): string {
    return value
      .split(/\s+/)
      .map((word) =>
        word.length <= 3 && word === word.toUpperCase()
          ? word
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join(' ');
  }

  private expandFollowUpKeywords(message: string): string[] {
    const lower = message.toLowerCase();
    const keywords = new Set<string>();

    if (/\b(contact|number|phone|mobile|call|helpline|whatsapp|support)\b/.test(lower)) {
      ['contact', 'number', 'phone', 'helpline', 'WhatsApp'].forEach((k) => keywords.add(k));
    }
    if (/\b(email|mail)\b/.test(lower)) {
      ['email', 'support', 'contact'].forEach((k) => keywords.add(k));
    }
    const asksHours = /\b(hours|open|opening|closing|time)\b/.test(lower);

    if (/\b(address|location|branch)\b/.test(lower) || (/\boffice\b/.test(lower) && !asksHours)) {
      ['office location', 'address', 'physical address', 'branch', 'contact'].forEach((k) => keywords.add(k));
    }
    if (asksHours) {
      ['office hours', 'opening hours', 'hours'].forEach((k) => keywords.add(k));
    }
    if (/\b(website|url|link)\b/.test(lower)) {
      ['website', 'url', 'link'].forEach((k) => keywords.add(k));
    }
    if (/\b(price|cost|fare|rate)\b/.test(lower)) {
      ['price', 'cost', 'fare', 'rate'].forEach((k) => keywords.add(k));
    }
    if (/\b(policy|terms)\b/.test(lower)) {
      ['policy', 'terms'].forEach((k) => keywords.add(k));
    }

    return Array.from(keywords);
  }

  async chat(
    message: string,
    sessionId: string,
    userId: string,
  ): Promise<{ answer: string; cached: boolean; usage: MessageUsageSnapshot; action?: ChatRedirectAction }> {
    const usage = await this.usageService.incrementOrThrow(userId);

    const [history, systemPrompt, chatToolConfigs] = await Promise.all([
      this.loadHistory(sessionId, userId),
      this.buildSystemPrompt(userId),
      this.chatToolsService.list(userId),
    ]);
    const enabledChatToolConfigs = chatToolConfigs.filter((config) => config.enabled);
    const hasCompanyProfile = Boolean(systemPrompt.activeCompanyName);
    const retrievalIntent = this.buildDeterministicRetrievalIntent(
      history,
      message,
      systemPrompt.activeCompanyName,
    );
    const isFollowUp =
      this.hasFollowUpReference(message) || this.isEllipticalFollowUp(message);

    if (isFollowUp && !retrievalIntent) {
      await this.saveTurn(sessionId, userId, message, CLARIFICATION_MESSAGE);
      return { answer: CLARIFICATION_MESSAGE, cached: false, usage };
    }

    // Use the same context-aware query for cache lookup, relevance preflight,
    // and cache save so short follow-ups such as "their office location?"
    // are searched as part of the current conversation instead of in isolation.
    const retrievalQuery =
      retrievalIntent ?? this.buildContextualRetrievalQuery(history, message);
    const queryVector = await this.aiService.embedText(retrievalQuery);

    if (enabledChatToolConfigs.length === 0) {
      const cachedAnswer = await this.cacheService.findHit(queryVector, userId);
      if (cachedAnswer) {
        await this.saveTurn(sessionId, userId, message, cachedAnswer);
        return { answer: cachedAnswer, cached: true, usage };
      }
    }

    const hasKnowledge =
      hasCompanyProfile ||
      (await this.retrievalService.hasRelevantKnowledge(queryVector, userId));
    if (!hasKnowledge && enabledChatToolConfigs.length === 0) {
      this.logger.log('No relevant chunks in KB - returning fallback without calling LLM');
      await this.saveTurn(sessionId, userId, message, this.fallbackMessage);
      return { answer: this.fallbackMessage, cached: false, usage };
    }

    let answer: string;
    let action: ChatRedirectAction | undefined;
    try {
      const agentResult = await this.aiService.runAgenticLoop(
        systemPrompt.prompt,
        history,
        message,
        userId,
        retrievalIntent ?? undefined,
        enabledChatToolConfigs,
      );
      answer = agentResult.answer;
      action = agentResult.action;
    } catch (err) {
      this.logger.error('Agentic loop failed', err);
      answer = this.fallbackMessage;
    }

    const isFallback = answer.trim() === this.fallbackMessage.trim();

    const tasks: Promise<unknown>[] = [
      this.saveTurn(sessionId, userId, message, answer),
    ];
    if (!isFallback && !action) {
      tasks.push(this.cacheService.save(retrievalQuery, queryVector, answer, userId));
    }
    await Promise.all(tasks);

    return {
      answer,
      cached: false,
      usage,
      ...(action ? { action } : {}),
    };
  }

  private async loadHistory(
    sessionId: string,
    userId: string,
  ): Promise<ProviderHistoryMessage[]> {
    const msgs = await this.chatRepo.find({
      where: { sessionId, userId },
      order: { createdAt: 'DESC' },
      take: MAX_HISTORY,
    });

    // Fetch newest messages efficiently, then restore chronological order for the LLM.
    return msgs.reverse().map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }));
  }

  private async saveTurn(
    sessionId: string,
    userId: string,
    userMsg: string,
    aiMsg: string,
  ): Promise<void> {
    const userTime = new Date();
    const aiTime = new Date(userTime.getTime() + 1);
    await this.chatRepo.save([
      this.chatRepo.create({ sessionId, userId, role: 'user', content: userMsg, createdAt: userTime }),
      this.chatRepo.create({ sessionId, userId, role: 'assistant', content: aiMsg, createdAt: aiTime }),
    ]);
  }

  async getHistory(userId: string): Promise<SessionSummary[]> {
    const msgs = await this.chatRepo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    const sessionMap = new Map();
    for (const msg of msgs) {
      const arr = sessionMap.get(msg.sessionId) ?? [];
      arr.push(msg);
      sessionMap.set(msg.sessionId, arr);
    }

    const sessions: SessionSummary[] = [];
    for (const [sessionId, messages] of sessionMap) {
      const last = messages[messages.length - 1];
      sessions.push({
        sessionId,
        messageCount: messages.length,
        lastMessage: (last.content ?? '').slice(0, 120),
        lastRole: last.role as 'assistant' | 'user',
        firstMessageAt: (messages[0].createdAt ?? new Date()).toISOString(),
        lastMessageAt: (last.createdAt ?? new Date()).toISOString(),
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role as 'assistant' | 'user',
          content: m.content,
          createdAt: (m.createdAt ?? new Date()).toISOString(),
        })),
      });
    }

    return sessions.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  }
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SessionSummary {
  sessionId: string;
  messageCount: number;
  lastMessage: string;
  lastRole: 'user' | 'assistant';
  firstMessageAt: string;
  lastMessageAt: string;
  messages: SessionMessage[];
}
