import { Injectable } from '@nestjs/common';
import { LlmFactoryService } from '../llm/llm-factory.service';
import { AgenticLoopService } from './agentic-loop.service';
import {
  buildContextualToolQuery,
  type AgenticLoopResult,
  type Message,
  type QueryIntentClassification,
} from './ai.types';
import { MediaAiService } from './media-ai.service';
import { QueryIntentClassifier } from './query-intent.classifier';

export {
  buildContextualToolQuery,
  type AgenticLoopResult,
  type Message,
  type QueryIntentClassification,
};

@Injectable()
export class AiService {
  constructor(
    private readonly queryIntentClassifier: QueryIntentClassifier,
    private readonly agenticLoopService: AgenticLoopService,
    private readonly mediaAiService: MediaAiService,
    private readonly llmFactory: LlmFactoryService,
  ) {}

  async classifyQueryIntent(
    history: Message[],
    userMessage: string,
    activeCompanyName?: string,
    pendingClarificationQuestion?: string,
  ): Promise<QueryIntentClassification> {
    return this.queryIntentClassifier.classifyQueryIntent(
      history,
      userMessage,
      activeCompanyName,
      pendingClarificationQuestion,
    );
  }

  async runAgenticLoop(
    systemPrompt: string,
    history: Message[],
    userMessage: string,
    userId: string,
    retrievalIntent?: string,
  ): Promise<AgenticLoopResult> {
    return this.agenticLoopService.runAgenticLoop(
      systemPrompt,
      history,
      userMessage,
      userId,
      retrievalIntent,
    );
  }

  async analyzeImage(
    base64: string,
    mimeType: string,
  ): Promise<{ title: string; description: string }> {
    return this.mediaAiService.analyzeImage(base64, mimeType);
  }

  async extractTextFromPdf(buffer: Buffer, fileName: string): Promise<string> {
    return this.mediaAiService.extractTextFromPdf(buffer, fileName);
  }

  async embedText(text: string): Promise<number[]> {
    return this.llmFactory.getEmbeddings().embedQuery(text);
  }
}
