import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { ChatMessage } from './chat-message.entity';
import { AiService, type QueryIntentClassification } from '../../core/ai/ai.service';
import { CacheService } from '../../core/cache/cache.service';
import { CompanyService } from '../company/company.service';
import { RetrievalService } from '../../core/retrieval/retrieval.service';
import { MessageUsageSnapshot, UsageService } from '../usage/usage.service';
import { ChatRedirectAction } from '../chat-tools/chat-tools.types';
import { ChatToolsService } from '../chat-tools/chat-tools.service';
import type {
  FlightListContext,
  WidgetDomManipulation,
} from './flight-list-context';

/** Max stored messages loaded per session (10 full turns) */
const MAX_HISTORY = 20;
const RETRIEVAL_CONTEXT_TURNS = 6;
const RETRIEVAL_CONTEXT_CHAR_LIMIT = 1600;
const CLARIFICATION_MESSAGE = 'Which company or organization do you mean?';
const FALLBACK_MESSAGE =
  "That's outside the scope of what I can help with here. I'm only able to answer questions based on the available knowledge base - feel free to ask me anything related to it!";

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

  private shouldAskClarification(classification: QueryIntentClassification): boolean {
    return (
      classification.intent === 'clarification_needed' ||
      (classification.isFollowUp && !classification.resolvedQuery.trim())
    );
  }

  async chat(
    message: string,
    sessionId: string,
    userId: string,
    flightListContext?: FlightListContext,
  ): Promise<{
    answer: string;
    message?: string;
    cached: boolean;
    usage: MessageUsageSnapshot;
    action?: ChatRedirectAction;
    dommanipulate?: WidgetDomManipulation;
  }> {
    const usage = await this.usageService.incrementOrThrow(userId);

    const [history, systemPrompt, chatToolConfigs] = await Promise.all([
      this.loadHistory(sessionId, userId),
      this.buildSystemPrompt(userId),
      this.chatToolsService.list(userId),
    ]);
    const enabledChatToolConfigs = chatToolConfigs.filter((config) => config.enabled);
    const hasCompanyProfile = Boolean(systemPrompt.activeCompanyName);
    const classification = await this.aiService.classifyQueryIntent(
      history,
      message,
      systemPrompt.activeCompanyName,
      flightListContext,
    );
    const retrievalIntent = classification.resolvedQuery.trim() || null;

    if (this.shouldAskClarification(classification)) {
      await this.saveTurn(sessionId, userId, message, CLARIFICATION_MESSAGE);
      return { answer: CLARIFICATION_MESSAGE, cached: false, usage };
    }

    if (classification.intent === 'flight_list_query' && flightListContext) {
      const visibleFlightResult = this.aiService.analyzeVisibleFlightContext(
        retrievalIntent ?? message,
        flightListContext,
      );
      await this.saveTurn(sessionId, userId, message, visibleFlightResult.answer);
      return {
        answer: visibleFlightResult.answer,
        cached: false,
        usage,
        ...(visibleFlightResult.dommanipulate
          ? { dommanipulate: visibleFlightResult.dommanipulate }
          : {}),
      };
    }

    // Use the same context-aware query for cache lookup, relevance preflight,
    // and cache save so short follow-ups such as "their office location?"
    // are searched as part of the current conversation instead of in isolation.
    const retrievalQuery =
      retrievalIntent ??
      this.buildContextualRetrievalQuery(history, message);
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
      classification.intent === 'flight_list_query' ||
      classification.intent === 'standalone_knowledge_page' ||
      (await this.retrievalService.hasRelevantKnowledge(queryVector, userId));
    if (!hasKnowledge && enabledChatToolConfigs.length === 0) {
      this.logger.log('No relevant chunks in KB - returning fallback without calling LLM');
      await this.saveTurn(sessionId, userId, message, this.fallbackMessage);
      return { answer: this.fallbackMessage, cached: false, usage };
    }

    let answer: string;
    let action: ChatRedirectAction | undefined;
    let dommanipulate: WidgetDomManipulation | undefined;
    let usedToolKeys: string[] = [];
    const agentChatToolConfigs =
      classification.intent === 'flight_list_query' && flightListContext
        ? enabledChatToolConfigs.filter((config) => config.toolKey !== 'flight_search')
        : enabledChatToolConfigs;
    try {
      const agentResult = await this.aiService.runAgenticLoop(
        systemPrompt.prompt,
        history,
        message,
        userId,
        classification.intent === 'direct' ? undefined : retrievalIntent ?? undefined,
        agentChatToolConfigs,
        flightListContext,
      );
      answer = agentResult.answer;
      action = agentResult.action;
      dommanipulate = agentResult.dommanipulate;
      usedToolKeys = agentResult.usedToolKeys ?? [];
    } catch (err) {
      this.logger.error('Agentic loop failed', err);
      answer = this.fallbackMessage;
    }

    const isFallback = answer.trim() === this.fallbackMessage.trim();
    const usedFlightTool = usedToolKeys.some((toolKey) =>
      ['city_to_airport', 'flight_search', 'analyze_visible_flights'].includes(toolKey),
    );

    const tasks: Promise<unknown>[] = [
      this.saveTurn(sessionId, userId, message, answer),
    ];
    if (!isFallback && !action && !usedFlightTool && classification.intent !== 'flight_list_query') {
      tasks.push(this.cacheService.save(retrievalQuery, queryVector, answer, userId));
    }
    await Promise.all(tasks);

    return {
      answer,
      cached: false,
      usage,
      ...(action ? { action } : {}),
      ...(dommanipulate ? { dommanipulate } : {}),
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
