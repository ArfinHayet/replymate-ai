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

/** Max stored messages loaded per session (10 full turns) */
const MAX_HISTORY = 20;

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
  ) {}

  onModuleInit() {
    const promptPath = path.join(__dirname, 'prompts', 'system.prompt.txt');
    this.systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    // Extract fallback sentence from the prompt file so it stays in sync
    const lines = this.systemPrompt.split('\n');
    const markerIdx = lines.findIndex((l) =>
      l.includes('respond with exactly this sentence'),
    );
    this.fallbackMessage =
      markerIdx !== -1 && lines[markerIdx + 1]
        ? lines[markerIdx + 1].trim()
        : "That's outside the scope of what I can help with here. I'm only able to answer questions based on the available knowledge base — feel free to ask me anything related to it!";

    this.logger.log('System prompt loaded');
  }

  private async buildSystemPrompt(userId: string): Promise<string> {
    const company = await this.companyService.getActive(userId);
    console.log('Active company profile:', company, userId);
    if (!company) return this.systemPrompt;

    const name = company.name;
    const description = company.shortDescription;

    const persona = [
      `You are a support representative for ${name}.`,
      `Company overview: ${description}`,
      `IMPORTANT: If the user asks "who are you", "what are you", "introduce yourself", "tell me about yourself", or any similar identity question, you MUST respond with exactly this: "I'm a support assistant for ${name}. ${description} How can I help you today?" — do NOT call any tool for this.`,
      `When users ask about "your company", "what you do", "your services", or anything about ${name}, you MUST call search_documents("${name}") to retrieve detailed information before answering.`,
      '',
    ].join('\n');

    return persona + '\n' + this.systemPrompt;
  }

  async chat(
    message: string,
    sessionId: string,
    userId: string,
  ): Promise<{ answer: string; cached: boolean }> {

    // ── 1. Embed question (needed for cache lookup) ──────────────────────────
    const queryVector = await this.aiService.embedText(message);

    // ── 2. Semantic cache check ──────────────────────────────────────────────
    const cachedAnswer = await this.cacheService.findHit(queryVector, userId);
    if (cachedAnswer) {
      await this.saveTurn(sessionId, userId, message, cachedAnswer);
      return { answer: cachedAnswer, cached: true };
    }

    // ── 2.5 Pre-flight: if no relevant chunks exist, skip LLM entirely ───────
    // Build the system prompt first so we know if a company profile is active.
    // If one is active, the profile itself provides context (e.g. identity
    // questions) so we skip the pre-flight chunk check in that case.
    const [history, systemPrompt] = await Promise.all([
      this.loadHistory(sessionId, userId),
      this.buildSystemPrompt(userId),
    ]);

    const hasCompanyProfile = systemPrompt !== this.systemPrompt;
    const hasKnowledge = hasCompanyProfile || await this.retrievalService.hasRelevantChunks(queryVector, userId);
    if (!hasKnowledge) {
      this.logger.log('No relevant chunks in KB — returning fallback without calling LLM');
      await this.saveTurn(sessionId, userId, message, this.fallbackMessage);
      return { answer: this.fallbackMessage, cached: false };
    }

    // ── 3. Load conversation history + build dynamic system prompt ───────────
    // (already done above)

    // ── 4. Run agentic loop — LLM decides when/what to retrieve ─────────────
    let answer: string;
    try {
      answer = await this.aiService.runAgenticLoop(
        systemPrompt,
        history,
        message,
        userId,
      );
    } catch (err) {
      this.logger.error('Agentic loop failed', err);
      answer = this.fallbackMessage;
    }

    // ── 5. Detect fallback — do not cache non-answers ────────────────────────
    const isFallback = answer.trim() === this.fallbackMessage.trim();

    // ── 6. Persist turn + cache (in parallel, only if non-fallback) ─────────
    const tasks: Promise<unknown>[] = [
      this.saveTurn(sessionId, userId, message, answer),
    ];
    if (!isFallback) {
      tasks.push(this.cacheService.save(message, queryVector, answer, userId));
    }
    await Promise.all(tasks);

    return { answer, cached: false };
  }

  private async loadHistory(sessionId: string, userId: string) {
    const msgs = await this.chatRepo.find({
      where: { sessionId, userId },
      order: { createdAt: 'ASC' },
      take: MAX_HISTORY,
    });
    // Map to the provider message format.
    return msgs.map((m) => ({
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
        lastRole: last.role as 'user' | 'assistant',
        firstMessageAt: (messages[0].createdAt ?? new Date()).toISOString(),
        lastMessageAt: (last.createdAt ?? new Date()).toISOString(),
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
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
