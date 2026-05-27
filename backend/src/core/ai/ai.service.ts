import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import {
  HumanMessage,
  AIMessage,
  BaseMessage,
  type MessageContentComplex,
} from '@langchain/core/messages';
import { createAgent } from 'langchain';
import { LlmFactoryService } from '../llm/llm-factory.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import {
  ChatRedirectAction,
  ChatToolConfigResponse,
} from '../../features/chat-tools/chat-tools.types';
import {
  FlightSearchToolInput,
  ToolRetrievalService,
} from '../retrieval/tool-retrieval.service';

const analyzeOutputSchema = z.object({
  title: z.string().describe('A concise title (5-10 words) for the image'),
  description: z.string().describe('A 2-3 sentence factual description of the image'),
});

/** History shape shared with ChatService */
export interface Message {
  role: 'user' | 'model';
  parts: { text?: string }[];
}

export type AgenticLoopResult = {
  answer: string;
  action?: ChatRedirectAction;
  usedToolKeys?: string[];
};

const TOOL_QUERY_CONTEXT_TURNS = 6;
const TOOL_QUERY_CONTEXT_CHAR_LIMIT = 1600;

export function buildContextualToolQuery(
  toolQuery: string,
  history: Message[],
  userMessage: string,
  retrievalIntent?: string,
): string {
  const recentContext = history
    .slice(-TOOL_QUERY_CONTEXT_TURNS)
    .map((m) => {
      const role = m.role === 'user' ? 'User' : 'Assistant';
      const text = m.parts.map((p) => p.text ?? '').join('').trim();
      return text ? `${role}: ${text}` : '';
    })
    .filter(Boolean)
    .join('\n')
    .slice(-TOOL_QUERY_CONTEXT_CHAR_LIMIT);

  if (!recentContext && !retrievalIntent) return toolQuery;

  return [
    `Tool query: ${toolQuery}`,
    `Current user question: ${userMessage}`,
    retrievalIntent ? `Standalone retrieval intent:\n${retrievalIntent}` : '',
    recentContext ? `Recent conversation context:\n${recentContext}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly llmFactory: LlmFactoryService,
    private readonly retrievalService: RetrievalService,
    private readonly toolRetrievalService: ToolRetrievalService,
  ) {}

  private buildContextualToolQuery(
    toolQuery: string,
    history: Message[],
    userMessage: string,
    retrievalIntent?: string,
  ): string {
    return buildContextualToolQuery(
      toolQuery,
      history,
      userMessage,
      retrievalIntent,
    );
  }

  /**
   * Agentic loop via LangGraph createReactAgent.
   * The LLM automatically decides when and how many times to call
   * search_documents — no manual functionCall inspection needed.
   */
  async runAgenticLoop(
    systemPrompt: string,
    history: Message[],
    userMessage: string,
    userId: string,
    retrievalIntent?: string,
    chatToolConfigs: ChatToolConfigResponse[] = [],
  ): Promise<AgenticLoopResult> {
    const maxIterations = this.config.get<number>('rag.maxToolIterations') ?? 10;

    // ── 1. Tool definitions ───────────────────────────────────────────────────
    // Accumulate every {title, url} pair the search_images tool returns so we
    // can restore any URLs the LLM inadvertently mutates in its final answer.
    const imageUrls: { title: string; url: string }[] = [];
    const redirectActions: ChatRedirectAction[] = [];
    const usedToolKeys = new Set<string>();

    const searchDocumentsTool = tool(
      async ({ query }: { query: string }): Promise<string> => {
        this.logger.log(`Tool: search_documents("${query.slice(0, 80)}")`);
        return this.retrievalService.searchDocuments(
          this.buildContextualToolQuery(query, history, userMessage, retrievalIntent),
          userId,
        );
      },
      {
        name: 'search_documents',
        description:
          'Search the uploaded PDF document knowledge base for content relevant to a query. ' +
          'Call this tool for EVERY factual question before answering. ' +
          'You may call it multiple times with different queries for complex questions. ' +
          'Returns the most relevant document excerpts.',
        schema: z.object({
          query: z.string().describe(
            'A focused natural-language search query. ' +
            'For multi-part questions, break into separate targeted queries ' +
            'and call the tool once per query.',
          ),
        }),
      },
    );

    const searchImagesTool = tool(
      async ({ query }: { query: string }): Promise<string> => {
        this.logger.log(`Tool: search_images("${query.slice(0, 80)}")`);
        const result = await this.retrievalService.searchImages(
          this.buildContextualToolQuery(query, history, userMessage, retrievalIntent),
          userId,
        );
        // Parse every Title/URL pair so we can restore them if the LLM mutates them.
        for (const block of result.split(/\n\n+/)) {
          const titleMatch = block.match(/^Title:\s*(.+)$/m);
          const urlMatch   = block.match(/^URL:\s*(.+)$/m);
          if (titleMatch && urlMatch) {
            imageUrls.push({ title: titleMatch[1].trim(), url: urlMatch[1].trim() });
          }
        }
        return result;
      },
      {
        name: 'search_images',
        description:
          'Search the uploaded image knowledge base for images relevant to a query. ' +
          'Call this tool when the question may relate to visual content, photos, or images. ' +
          'Returns the title and description of the most relevant images.',
        schema: z.object({
          query: z.string().describe(
            'A focused natural-language search query describing what visual content to look for.',
          ),
        }),
      },
    );

    const searchWebPagesTool = tool(
      async ({ query }: { query: string }): Promise<string> => {
        this.logger.log(`Tool: search_web_pages("${query.slice(0, 80)}")`);
        return this.retrievalService.searchWebPages(
          this.buildContextualToolQuery(query, history, userMessage, retrievalIntent),
          userId,
        );
      },
      {
        name: 'search_web_pages',
        description:
          'Search the ingested web page knowledge base for content relevant to a query. ' +
          'Call this tool for EVERY factual question before answering — web pages may contain ' +
          'the most up-to-date information about a topic. ' +
          'You may call it multiple times with different queries for complex questions. ' +
          'Returns the most relevant excerpts from ingested web pages.',
        schema: z.object({
          query: z.string().describe(
            'A focused natural-language search query. ' +
            'For multi-part questions, break into separate targeted queries ' +
            'and call the tool once per query.',
          ),
        }),
      },
    );

    const tools: ReturnType<typeof tool>[] = [
      searchDocumentsTool,
      searchImagesTool,
      searchWebPagesTool,
    ];
    const flightSearchConfig = chatToolConfigs.find(
      (config) => config.toolKey === 'flight_search' && config.enabled,
    );
    const liveAgentConfig = chatToolConfigs.find(
      (config) => config.toolKey === 'live_agent_contact' && config.enabled,
    );

    if (flightSearchConfig) {
      const cityToAirportTool = tool(
        async ({ location }: { location: string }): Promise<string> => {
          this.logger.log(`Tool: city_to_airport("${location.slice(0, 80)}")`);
          usedToolKeys.add('city_to_airport');
          return this.toolRetrievalService.cityToAirport(location);
        },
        {
          name: 'city_to_airport',
          description:
            'Resolve a city, airport, country, or corrected user misspelling into IATA-style airport/city codes. ' +
            'Call this for every flight origin and destination before calling flight_search.',
          schema: z.object({
            location: z.string().describe(
              'A city, airport, or country name. Correct obvious user typos before calling, for example Dakka -> Dhaka.',
            ),
          }),
        },
      );

      const flightSearchTool = tool(
        async (input: FlightSearchToolInput): Promise<string> => {
          this.logger.log(
            `Tool: flight_search("${input.originCode}" -> "${input.destinationCode}")`,
          );
          usedToolKeys.add('flight_search');
          const result = this.toolRetrievalService.buildFlightRedirect(
            flightSearchConfig,
            input,
          );
          if (result.action) {
            redirectActions.push(result.action);
            return 'Flight search redirect is ready. Final answer must be exactly: Redirecting to flight page';
          }
          return result.answer;
        },
        {
          name: 'flight_search',
          description:
            'Build a flight search redirect URL after route locations have been resolved with city_to_airport. ' +
            'Use only when the user wants flight search, tickets, or travel booking. ' +
            'If the user gives dates without a year, use the Current year from the system Runtime context. ' +
            'If the user gives opposite-direction outbound and return legs, use tripType round_trip.',
          schema: z.object({
            tripType: z.enum(['one_way', 'round_trip', 'multi_city']).describe(
              'Use one_way by default. Use round_trip when the user gives an outbound leg and a return leg in the opposite direction.',
            ),
            originCode: z.string().describe('Resolved IATA origin code, such as DAC.'),
            destinationCode: z.string().describe('Resolved IATA destination code, such as KUL.'),
            originName: z.string().optional().describe('Resolved origin city or airport display name from city_to_airport, such as Dhaka.'),
            destinationName: z.string().optional().describe('Resolved destination city or airport display name from city_to_airport, such as Dubai.'),
            originAirportName: z.string().optional().describe('Resolved origin airport name from city_to_airport when available.'),
            destinationAirportName: z.string().optional().describe('Resolved destination airport name from city_to_airport when available.'),
            originCountryName: z.string().optional().describe('Resolved origin country name from city_to_airport when available.'),
            destinationCountryName: z.string().optional().describe('Resolved destination country name from city_to_airport when available.'),
            departDate: z.string().describe(
              'Departure date in YYYY-MM-DD format. If the user omitted the year, use the Current year from Runtime context.',
            ),
            returnDate: z.string().optional().describe(
              'Return date in YYYY-MM-DD format for round trips. If the user omitted the year, use the Current year from Runtime context.',
            ),
            adult: z.number().int().min(0).optional().describe('Adult passenger count. Default 1.'),
            child: z.number().int().min(0).optional().describe('Child passenger count. Default 0.'),
            childAge: z.string().optional().describe('Comma-separated child ages if provided.'),
            infant: z.number().int().min(0).optional().describe('Infant passenger count. Default 0.'),
            cabinClass: z.string().optional().describe('Cabin class. Default Economy.'),
          }),
        },
      );

      tools.push(cityToAirportTool, flightSearchTool);
    }

    if (liveAgentConfig) {
      const liveAgentContactTool = tool(
        async (): Promise<string> => {
          this.logger.log('Tool: live_agent_contact');
          usedToolKeys.add('live_agent_contact');
          const result = this.toolRetrievalService.buildLiveAgentRedirect(
            liveAgentConfig,
          );
          if (result.action) {
            redirectActions.push(result.action);
            return 'Live agent redirect is ready. Final answer must be exactly: Redirecting to Live Agent';
          }
          return result.answer;
        },
        {
          name: 'live_agent_contact',
          description:
            'Redirect the user to a configured human/live agent channel such as WhatsApp, Telegram, or live chat. ' +
            'Use when the user asks for a real person, human support, WhatsApp, Telegram, or live agent.',
          schema: z.object({
            reason: z.string().optional().describe('Short reason the user wants a live agent.'),
          }),
        },
      );

      tools.push(liveAgentContactTool);
    }

    // ── 2. LLM ────────────────────────────────────────────────────────────────
    const llm = this.llmFactory.getChatModel();

    // ── 3. Convert stored history to LangChain messages ──────────────────────
    const chatHistory: BaseMessage[] = history.map((m) => {
      const text = m.parts.map((p) => p.text ?? '').join('');
      return m.role === 'user' ? new HumanMessage(text) : new AIMessage(text);
    });

    // ── 4. Agent — LangGraph handles the tool-call loop automatically ─────────
    const agent = createAgent({
      model: llm,
      tools,
      systemPrompt: systemPrompt,
    });

    const result = await agent.invoke(
      {
        messages: [
          ...chatHistory,
          new HumanMessage(userMessage),
        ],
      },
      {
        // LangGraph counts every node visit (agent + tool node = 2 per tool call).
        // Multiply by 4 to allow ~2x the configured tool iterations as headroom.
        recursionLimit: maxIterations * 4,
      },
    );

    console.log('Agentic loop result:', result);

    // Last message in the result is the final AI answer.
    // Some providers return content as an array of parts ({ type, text })
    // instead of a plain string. Extract text parts explicitly.
    const lastMsg = result.messages.at(-1);
    let output: string;
    if (typeof lastMsg?.content === 'string') {
      output = lastMsg.content;
    } else if (Array.isArray(lastMsg?.content)) {
      output = (lastMsg.content as { type: string; text?: string }[])
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text!)
        .join('');
    } else {
      output = '';
    }

    if (!output) throw new Error('Agent returned empty output');

    // Some models emit literal \n instead of real newlines — unescape them.
    const unescaped = output.replace(/\\n/g, '\n');

    // Restore any image URLs the LLM may have inadvertently modified.
    return {
      answer: this.restoreImageUrls(unescaped, imageUrls),
      action: redirectActions.at(-1),
      usedToolKeys: Array.from(usedToolKeys),
    };
  }

  /**
   * Scans Markdown image syntax in `text` and replaces any URL that does not
   * exactly match a known tool-result URL with the correct original.
   * Matching priority: exact → title → URL prefix → single-image fallback.
   */
  private restoreImageUrls(
    text: string,
    knownUrls: { title: string; url: string }[],
  ): string {
    if (knownUrls.length === 0) return text;

    return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt: string, url: string) => {
      // 1. Already exact — nothing to do.
      if (knownUrls.some((k) => k.url === url)) return match;

      // 2. Match by alt text ↔ known title (case-insensitive substring).
      const byTitle = knownUrls.find(
        (k) =>
          k.title.toLowerCase() === alt.toLowerCase() ||
          alt.toLowerCase().includes(k.title.toLowerCase()) ||
          k.title.toLowerCase().includes(alt.toLowerCase()),
      );
      if (byTitle) {
        this.logger.warn(`Restored image URL for "${alt}": "${url}" → "${byTitle.url}"`);
        return `![${alt}](${byTitle.url})`;
      }

      // 3. URL shares the same storage path (LLM may have truncated a query string).
      const byPrefix = knownUrls.find((k) => {
        const knownBase = k.url.split('?')[0];
        const givenBase = url.split('?')[0];
        return (
          knownBase === givenBase ||
          knownBase.startsWith(givenBase) ||
          givenBase.startsWith(knownBase)
        );
      });
      if (byPrefix) {
        this.logger.warn(`Restored image URL by prefix for "${alt}": "${url}" → "${byPrefix.url}"`);
        return `![${alt}](${byPrefix.url})`;
      }

      // 4. Only one known image — it must be the intended target.
      if (knownUrls.length === 1) {
        this.logger.warn(`Restored single image URL for "${alt}": "${url}" → "${knownUrls[0].url}"`);
        return `![${alt}](${knownUrls[0].url})`;
      }

      return match;
    });
  }

  /**
   * Analyze an image and return a structured title + description.
   * Uses withStructuredOutput for type-safe JSON parsing.
   */
  async analyzeImage(
    base64: string,
    mimeType: string,
  ): Promise<{ title: string; description: string }> {
    const llm = this.llmFactory.getChatModel().withStructuredOutput(analyzeOutputSchema);

    const result = await llm.invoke([
      new HumanMessage({
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: 'Generate a concise title (5-10 words) and a 2-3 sentence factual description for this image.',
          },
        ],
      }),
    ]);

    this.logger.log(`Image analyzed: "${result.title}"`);
    return result;
  }

  /**
   * Extract readable text from a PDF using the configured chat model.
   * Providers/models that do not support PDF document input fail gracefully.
   */
  async extractTextFromPdf(buffer: Buffer, fileName: string): Promise<string> {
    const modelName = this.llmFactory.getChatModelName();

    try {
      this.logger.log(`AI PDF extraction started for ${fileName} using ${modelName}`);
      const llm = this.llmFactory.getChatModel();
      const pdfContent: MessageContentComplex[] = [
        {
          type: 'application/pdf',
          data: buffer.toString('base64'),
        },
        {
          type: 'text',
          text:
            'Extract all readable text from this PDF for document search. ' +
            'Preserve names, headings, dates, contact details, bullet points, and section order. ' +
            'Return only the extracted text. If there is no readable text, return an empty response.',
        },
      ];

      const result = await llm.invoke([
        new HumanMessage({
          content: pdfContent as never,
        }),
      ]);

      const extractedText = this.extractMessageText(result.content).trim();
      this.logger.log(
        `AI PDF extraction returned ${extractedText.length} characters for ${fileName}`,
      );
      return extractedText;
    } catch (err) {
      this.logger.warn(
        `AI PDF extraction failed for ${fileName} using ${modelName}: ${(err as Error).message}`,
      );
      return '';
    }
  }

  private extractMessageText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';

    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (
          part &&
          typeof part === 'object' &&
          'type' in part &&
          part.type === 'text' &&
          'text' in part &&
          typeof part.text === 'string'
        ) {
          return part.text;
        }
        return '';
      })
      .join('');
  }

  /** Embed a text string using the configured embedding provider */
  async embedText(text: string): Promise<number[]> {
    return this.llmFactory.getEmbeddings().embedQuery(text);
  }
}
