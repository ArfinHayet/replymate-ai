import { Injectable } from '@nestjs/common';
import type { FlightListContext } from '../../features/chat/flight-list-context';
import type { ChatToolConfigResponse } from '../../features/chat-tools/chat-tools.types';
import { LlmFactoryService } from '../llm/llm-factory.service';
import { AgenticLoopService } from './agentic-loop.service';
import {
  buildContextualToolQuery,
  type AgenticLoopResult,
  type Message,
  type QueryIntentClassification,
  type VisibleFlightAnalysisResult,
} from './ai.types';
import { MediaAiService } from './media-ai.service';
import { QueryIntentClassifier } from './query-intent.classifier';
import {
  type FlightListCriteria,
} from './visible-flights/visible-flight-criteria';
import { VisibleFlightAnalyzerService } from './visible-flights/visible-flight-analyzer.service';

export {
  buildContextualToolQuery,
  type AgenticLoopResult,
  type Message,
  type QueryIntentClassification,
  type VisibleFlightAnalysisResult,
};
export type { FlightListCriteria };

@Injectable()
export class AiService {
  constructor(
    private readonly queryIntentClassifier: QueryIntentClassifier,
    private readonly agenticLoopService: AgenticLoopService,
    private readonly visibleFlightAnalyzer: VisibleFlightAnalyzerService,
    private readonly mediaAiService: MediaAiService,
    private readonly llmFactory: LlmFactoryService,
  ) {}

  async classifyQueryIntent(
    history: Message[],
    userMessage: string,
    activeCompanyName?: string,
    flightListContext?: FlightListContext,
  ): Promise<QueryIntentClassification> {
    return this.queryIntentClassifier.classifyQueryIntent(
      history,
      userMessage,
      activeCompanyName,
      flightListContext,
    );
  }

  async runAgenticLoop(
    systemPrompt: string,
    history: Message[],
    userMessage: string,
    userId: string,
    retrievalIntent?: string,
    chatToolConfigs: ChatToolConfigResponse[] = [],
    flightListContext?: FlightListContext,
  ): Promise<AgenticLoopResult> {
    return this.agenticLoopService.runAgenticLoop(
      systemPrompt,
      history,
      userMessage,
      userId,
      retrievalIntent,
      chatToolConfigs,
      flightListContext,
    );
  }

  async analyzeVisibleFlightContext(
    query: string,
    flightListContext: FlightListContext,
    flightListCriteria?: FlightListCriteria,
  ): Promise<VisibleFlightAnalysisResult> {
    return this.visibleFlightAnalyzer.analyzeVisibleFlightContext(
      query,
      flightListContext,
      flightListCriteria,
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
