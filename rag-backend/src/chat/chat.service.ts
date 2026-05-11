import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { ChatMessage } from './chat-message.entity';
import { GeminiService } from '../gemini/gemini.service';
import { CacheService } from '../cache/cache.service';
import { CompanyService } from '../company/company.service';
import { RetrievalService } from '../retrieval/retrieval.service';

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
    private readonly geminiService: GeminiService,
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
        : "I'm sorry, I don't have information about that in the available documents.";

    this.logger.log('System prompt loaded');
  }

  private sanitizeForPrompt(value: string, maxLength = 500): string {
    return value
      .slice(0, maxLength)
      .replace(
        /\b(ignore|disregard|forget|override|bypass|you are now|act as|new instructions?|system prompt|jailbreak)\b/gi,
        '[removed]',
      )
      .replace(/[<>{}]/g, '');
  }

  private async buildSystemPrompt(): Promise<string> {
    const company = await this.companyService.getActive();
    if (!company) return this.systemPrompt;

    const name = this.sanitizeForPrompt(company.name, 100);
    const description = this.sanitizeForPrompt(company.shortDescription, 500);

    const persona = [
      '<company_profile>',
      `You are a support representative for ${name}.`,
      `Company overview: ${description}`,
      `When users ask about "your company", "what you do", "your services", or anything about ${name}, you MUST call search_documents("${name}") to retrieve detailed information before answering.`,
      '</company_profile>',
      '',
    ].join('\n');

    return persona + '\n' + this.systemPrompt;
  }

  async chat(
    message: string,
    sessionId: string,
  ): Promise<{ answer: string; cached: boolean }> {

    // ── 1. Embed question (needed for cache lookup) ──────────────────────────
    const queryVector = await this.geminiService.embedText(message);

    // ── 2. Semantic cache check ──────────────────────────────────────────────
    const cachedAnswer = await this.cacheService.findHit(queryVector);
    if (cachedAnswer) {
      await this.saveTurn(sessionId, message, cachedAnswer);
      return { answer: cachedAnswer, cached: true };
    }

    // ── 2.5 Pre-flight: if no relevant chunks exist, skip LLM entirely ───────
    const hasKnowledge = await this.retrievalService.hasRelevantChunks(queryVector);
    if (!hasKnowledge) {
      this.logger.log('No relevant chunks in KB — returning fallback without calling LLM');
      await this.saveTurn(sessionId, message, this.fallbackMessage);
      return { answer: this.fallbackMessage, cached: false };
    }

    // ── 3. Load conversation history + build dynamic system prompt ───────────
    const [history, systemPrompt] = await Promise.all([
      this.loadHistory(sessionId),
      this.buildSystemPrompt(),
    ]);

    // ── 4. Run agentic loop — LLM decides when/what to retrieve ─────────────
    let answer: string;
    try {
      answer = await this.geminiService.runAgenticLoop(
        systemPrompt,
        history,
        message,
      );
    } catch (err) {
      this.logger.error('Agentic loop failed', err);
      answer = this.fallbackMessage;
    }

    // ── 5. Detect fallback — do not cache non-answers ────────────────────────
    const isFallback = answer.trim() === this.fallbackMessage.trim();

    // ── 6. Persist turn + cache (in parallel, only if non-fallback) ─────────
    const tasks: Promise<unknown>[] = [
      this.saveTurn(sessionId, message, answer),
    ];
    if (!isFallback) {
      tasks.push(this.cacheService.save(message, queryVector, answer));
    }
    await Promise.all(tasks);

    return { answer, cached: false };
  }

  private async loadHistory(sessionId: string) {
    const msgs = await this.chatRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: MAX_HISTORY,
    });
    // Map to Gemini message format
    return msgs.map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }));
  }

  private async saveTurn(
    sessionId: string,
    userMsg: string,
    aiMsg: string,
  ): Promise<void> {
    await this.chatRepo.save([
      this.chatRepo.create({ sessionId, role: 'user', content: userMsg }),
      this.chatRepo.create({ sessionId, role: 'assistant', content: aiMsg }),
    ]);
  }
}
