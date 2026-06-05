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
import type {
  FlightListContext,
  WidgetDomManipulation,
} from '../../features/chat/flight-list-context';
import {
  FlightSearchToolInput,
  ToolRetrievalService,
} from '../retrieval/tool-retrieval.service';

const analyzeOutputSchema = z.object({
  title: z.string().describe('A concise title (5-10 words) for the image'),
  description: z.string().describe('A 2-3 sentence factual description of the image'),
});

const queryIntentOutputSchema = z.object({
  isFollowUp: z.boolean().describe(
    'True when the user message depends on a previous subject or context.',
  ),
  intent: z.enum([
    'direct',
    'follow_up',
    'standalone_knowledge_page',
    'flight_list_query',
    'clarification_needed',
  ]),
  resolvedQuery: z.string().describe(
    'A standalone retrieval/search query. Use an empty string only when clarification is needed.',
  ),
});

/** History shape shared with ChatService */
export interface Message {
  role: 'user' | 'model';
  parts: { text?: string }[];
}

export type QueryIntentClassification = z.infer<typeof queryIntentOutputSchema>;

export type AgenticLoopResult = {
  answer: string;
  action?: ChatRedirectAction;
  dommanipulate?: WidgetDomManipulation;
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

  async classifyQueryIntent(
    history: Message[],
    userMessage: string,
    activeCompanyName?: string,
    flightListContext?: FlightListContext,
  ): Promise<QueryIntentClassification> {
    const recentHistory = history
      .slice(-8)
      .map((m) => {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        const text = m.parts.map((p) => p.text ?? '').join('').trim();
        return text ? `${role}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n')
      .slice(-2500);

    const prompt = [
      'Classify the current user message for a RAG chatbot.',
      '',
      'Return only the structured JSON fields required by the schema.',
      '',
      'Intent meanings:',
      '- direct: the message is already answerable as a standalone request.',
      '- follow_up: the message depends on a subject from recent history or the active company profile.',
      '- standalone_knowledge_page: the user is asking for a common website page such as terms and conditions, privacy policy, refund policy, return policy, FAQ, about us, or contact us.',
      '- flight_list_query: flightListContext is present and the user asks to compare, rank, filter, select, or explain flights from the visible flight results list.',
      '- clarification_needed: the message is a follow-up, but no subject can be resolved from history or the active company profile.',
      '',
      'Rules:',
      '- Use flight_list_query only when flightListContext is present. The resolvedQuery should describe the user goal over the visible flight list.',
      '- For follow_up, resolve the missing subject from recent history first, then the active company profile.',
      '- For standalone_knowledge_page, do not mark it as a follow-up. Build a rich retrieval query that includes the page title and likely section words.',
      '- For direct, resolvedQuery should be the best concise standalone retrieval query for the message.',
      '- For clarification_needed, resolvedQuery must be an empty string.',
      '',
      activeCompanyName ? `Active company profile: ${activeCompanyName}` : 'Active company profile: none',
      flightListContext
        ? `Flight list context: present with ${flightListContext.totalFlights} visible flights`
        : 'Flight list context: none',
      recentHistory ? `Recent history:\n${recentHistory}` : 'Recent history: none',
      `Current user message: ${userMessage}`,
    ].join('\n');

    try {
      const llm = this.llmFactory
        .getChatModel()
        .withStructuredOutput(queryIntentOutputSchema);
      const result = await llm.invoke([new HumanMessage(prompt)]);
      return {
        isFollowUp: result.isFollowUp,
        intent: result.intent,
        resolvedQuery: result.resolvedQuery.trim(),
      };
    } catch (err) {
      this.logger.warn(
        `Query intent classification failed: ${(err as Error).message}`,
      );
      return {
        isFollowUp: false,
        intent: 'direct',
        resolvedQuery: userMessage.trim(),
      };
    }
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
    flightListContext?: FlightListContext,
  ): Promise<AgenticLoopResult> {
    const maxIterations = this.config.get<number>('rag.maxToolIterations') ?? 10;

    // ── 1. Tool definitions ───────────────────────────────────────────────────
    // Accumulate every {title, url} pair the search_images tool returns so we
    // can restore any URLs the LLM inadvertently mutates in its final answer.
    const imageUrls: { title: string; url: string }[] = [];
    const redirectActions: ChatRedirectAction[] = [];
    const domActions: WidgetDomManipulation[] = [];
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

      if (flightListContext?.type === 'flight_list' && flightListContext.flights.length > 0) {
        const analyzeVisibleFlightsTool = tool(
          async ({ query }: { query: string }): Promise<string> => {
            this.logger.log(`Tool: analyze_visible_flights("${query.slice(0, 80)}")`);
            usedToolKeys.add('analyze_visible_flights');
            const result = this.analyzeVisibleFlights(query, flightListContext);
            if (result.dommanipulate) {
              domActions.push(result.dommanipulate);
            }
            return JSON.stringify(result);
          },
          {
            name: 'analyze_visible_flights',
            description:
              'Analyze the visible OTA flight result cards supplied by the widget. ' +
              'Use this for questions such as cheapest flight, fastest flight, best baggage option, airline filters, refundable or non-refundable flights, best flight, or comparing flights in the current list. ' +
              'Answers must use only the supplied visible flight JSON and must include the selected flight index when a single card is best.',
            schema: z.object({
              query: z.string().describe(
                'The user goal for the visible flight list, such as find cheapest flight, fastest flight, or best baggage option.',
              ),
            }),
          },
        );

        tools.push(analyzeVisibleFlightsTool);
      }
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
      systemPrompt: this.buildAgentSystemPrompt(systemPrompt, flightListContext),
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
      dommanipulate: domActions.at(-1),
      usedToolKeys: Array.from(usedToolKeys),
    };
  }

  private buildAgentSystemPrompt(
    systemPrompt: string,
    flightListContext?: FlightListContext,
  ): string {
    if (!flightListContext?.flights.length) return systemPrompt;

    return [
      systemPrompt,
      '',
      'VISIBLE FLIGHT LIST RULES:',
      '- If the user asks about the currently visible flight results, such as cheapest, fastest, best baggage, best option, compare, rank, or select a flight, call analyze_visible_flights.',
      '- If the user asks to show visible flights for a specific airline or refundability, call analyze_visible_flights.',
      '- For visible flight list answers, use only the flight JSON supplied by the widget.',
      '- If analyze_visible_flights returns a selectedFlight, describe that flight naturally and mention any missing details as unavailable.',
      '- Do not invent prices, baggage, routes, times, durations, or airlines that are not present in the visible flight data.',
    ].join('\n');
  }

  private analyzeVisibleFlights(
    query: string,
    flightListContext: FlightListContext,
  ): {
    answer: string;
    selectedFlight?: FlightListContext['flights'][number];
    rankedFlights?: FlightListContext['flights'];
    dommanipulate?: WidgetDomManipulation;
  } {
    const normalizedQuery = query.toLowerCase();
    const flights = flightListContext.flights.filter((flight) => flight.rawText?.trim());

    if (flights.length === 0) {
      return { answer: 'No visible flight cards were available to analyze.' };
    }

    const filters = getVisibleFlightFilters(normalizedQuery);
    if (filters.length > 0) {
      const matchingFlights = flights.filter((flight) =>
        filters.every((filter) => filter.matches(flight)),
      );
      const label = buildCombinedFilterLabel(filters);

      if (matchingFlights.length === 0) {
        return {
          answer: `I could not find any visible flights matching ${buildCombinedNoMatchLabel(filters)}.`,
          rankedFlights: [],
        };
      }

      if (/\b(cheap|cheapest|lowest price|lowest fare|least expensive)\b/.test(normalizedQuery)) {
        const ranked = rankFlightsByPrice(matchingFlights);
        if (ranked.length > 0) {
          return this.buildVisibleFlightResult(
            `Cheapest ${label}`,
            `This is the cheapest visible flight matching ${label}.`,
            ranked[0],
            ranked,
          );
        }
      }

      if (/\b(fast|fastest|quick|quickest|shortest duration)\b/.test(normalizedQuery)) {
        const ranked = rankFlightsByDuration(matchingFlights);
        if (ranked.length > 0) {
          return this.buildVisibleFlightResult(
            `Fastest ${label}`,
            `This is the fastest visible flight matching ${label}.`,
            ranked[0],
            ranked,
          );
        }
      }

      if (/\b(baggage|bag|luggage|checked)\b/.test(normalizedQuery)) {
        const ranked = rankFlightsByBaggage(matchingFlights);
        if (ranked.length > 0) {
          return this.buildVisibleFlightResult(
            `Best baggage option, ${label}`,
            `This visible flight appears to have the best baggage option matching ${label}.`,
            ranked[0],
            ranked,
          );
        }
      }

      return this.buildVisibleFlightGroupResult(
        label,
        `These visible flights match ${label}.`,
        matchingFlights,
      );
    }

    if (/\b(fast|fastest|quick|quickest|shortest duration)\b/.test(normalizedQuery)) {
      const ranked = rankFlightsByDuration(flights);

      if (ranked.length > 0) {
        return this.buildVisibleFlightResult(
          'Fastest flight',
          'This is the fastest flight from the visible results.',
          ranked[0],
          ranked,
        );
      }
    }

    if (/\b(baggage|bag|luggage|checked)\b/.test(normalizedQuery)) {
      const ranked = rankFlightsByBaggage(flights);

      if (ranked.length > 0) {
        return this.buildVisibleFlightResult(
          'Best baggage option',
          'This visible flight appears to have the best baggage option.',
          ranked[0],
          ranked,
        );
      }
    }

    const ranked = rankFlightsByPrice(flights);

    if (ranked.length > 0) {
      return this.buildVisibleFlightResult(
        'Cheapest flight',
        'This is the cheapest flight from the visible results.',
        ranked[0],
        ranked,
      );
    }

    return {
      answer:
        'I can see the visible flight results, but the available card text does not include enough structured price, duration, or baggage information to select a matching flight.',
      rankedFlights: flights.slice(0, 5),
    };
  }

  private buildVisibleFlightResult(
    label: string,
    answer: string,
    selectedFlight: FlightListContext['flights'][number],
    rankedFlights: FlightListContext['flights'],
  ) {
    return {
      answer,
      selectedFlight,
      rankedFlights: rankedFlights.slice(0, 5),
      dommanipulate: {
        type: 'highlight_flight_card' as const,
        flightIndex: selectedFlight.index,
        label,
      },
    };
  }

  private buildVisibleFlightGroupResult(
    label: string,
    answer: string,
    rankedFlights: FlightListContext['flights'],
  ) {
    return {
      answer,
      selectedFlight: rankedFlights[0],
      rankedFlights: rankedFlights.slice(0, 25),
      dommanipulate: {
        type: 'highlight_flight_cards' as const,
        flightIndexes: rankedFlights.map((flight) => flight.index),
        label,
      },
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

type RequestedAirline = {
  label: string;
  aliases: string[];
};

type VisibleFlight = FlightListContext['flights'][number];

type VisibleFlightFilter = {
  label: string;
  combinedLabel: string;
  matches: (flight: VisibleFlight) => boolean;
};

const AIRLINE_ALIASES: RequestedAirline[] = [
  {
    label: 'Qatar Airways',
    aliases: ['qatar airways', 'qatar', 'qatar airw', 'qr'],
  },
  {
    label: 'US-Bangla',
    aliases: ['us bangla', 'us-bangla', 'usbangla', 'bs'],
  },
  {
    label: 'Biman Bangladesh',
    aliases: ['biman bangladesh', 'biman', 'biman bang', 'bg'],
  },
  {
    label: 'China Southern',
    aliases: ['china southern', 'cz'],
  },
  {
    label: 'Malaysia Airlines',
    aliases: ['malaysia airlines', 'malaysia', 'malaysia a', 'mh'],
  },
];

const AIRLINE_QUERY_STOP_WORDS = new Set([
  'airline',
  'airlines',
  'airways',
  'flight',
  'flights',
  'from',
  'show',
  'find',
  'me',
  'all',
  'visible',
  'the',
  'for',
  'with',
  'please',
]);

function normalizeForMatching(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRefundability(value: string | null | undefined): 'refundable' | 'non-refundable' | null {
  const normalized = normalizeForMatching(value);
  if (!normalized) return null;
  if (/\bnon\s?refundable\b/.test(normalized)) return 'non-refundable';
  if (/\brefundable\b/.test(normalized)) return 'refundable';
  return null;
}

function getRequestedRefundability(query: string): 'refundable' | 'non-refundable' | null {
  return parseRefundability(query);
}

function getVisibleFlightFilters(query: string): VisibleFlightFilter[] {
  const filters: VisibleFlightFilter[] = [];

  const requestedRefundability = getRequestedRefundability(query);
  if (requestedRefundability) {
    const label =
      requestedRefundability === 'non-refundable'
        ? 'Non-refundable flights'
        : 'Refundable flights';
    filters.push({
      label,
      combinedLabel: label,
      matches: (flight) => parseRefundability(flight.refundability ?? flight.rawText) === requestedRefundability,
    });
  }

  const requestedAirline = getRequestedAirline(query);
  if (requestedAirline) {
    filters.push({
      label: `${requestedAirline.label} flights`,
      combinedLabel: `${requestedAirline.label} flights`,
      matches: (flight) => flightMatchesAirline(flight, requestedAirline),
    });
  }

  const fareThreshold = getRequestedFareThreshold(query);
  if (fareThreshold) {
    const label =
      fareThreshold.direction === 'above'
        ? `Fare above ${fareThreshold.amount}`
        : `Fare below ${fareThreshold.amount}`;
    filters.push({
      label,
      combinedLabel:
        fareThreshold.direction === 'above'
          ? `fare above ${fareThreshold.amount}`
          : `fare below ${fareThreshold.amount}`,
      matches: (flight) => {
        const price = parsePriceAmount(flight.price ?? flight.rawText);
        if (price === null) return false;
        return fareThreshold.direction === 'above'
          ? price > fareThreshold.amount
          : price < fareThreshold.amount;
      },
    });
  }

  const requestedStopCount = getRequestedStopCount(query);
  if (requestedStopCount !== null) {
    const label =
      requestedStopCount === 0
        ? '0 stops flights'
        : `${requestedStopCount} stop${requestedStopCount === 1 ? '' : 's'} flights`;
    filters.push({
      label,
      combinedLabel: label,
      matches: (flight) => parseStopsCount(flight.stops ?? flight.rawText) === requestedStopCount,
    });
  }

  return filters;
}

function buildCombinedFilterLabel(filters: VisibleFlightFilter[]): string {
  if (filters.length === 1) return filters[0].label;
  return filters.map((filter) => filter.combinedLabel).join(', ');
}

function buildCombinedNoMatchLabel(filters: VisibleFlightFilter[]): string {
  return filters.map((filter) => filter.combinedLabel).join(', ');
}

function getRequestedAirline(query: string): RequestedAirline | null {
  const normalizedQuery = normalizeForMatching(query);
  if (!normalizedQuery) return null;

  const knownAirline = AIRLINE_ALIASES.find((airline) =>
    airline.aliases.some((alias) => hasNormalizedPhrase(normalizedQuery, normalizeForMatching(alias))),
  );
  if (knownAirline) return knownAirline;

  const genericCandidate = getGenericAirlineCandidate(normalizedQuery);
  if (!genericCandidate) return null;

  return {
    label: toTitleCase(genericCandidate),
    aliases: [genericCandidate],
  };
}

function getGenericAirlineCandidate(normalizedQuery: string): string | null {
  const fromMatch = normalizedQuery.match(/\bflights?\s+from\s+([a-z0-9 ]+)\b/);
  const trailingMatch = normalizedQuery.match(/\b(?:show|find)\s+([a-z0-9 ]+?)(?:\s+flights?)?\b/);
  const suffixMatch = normalizedQuery.match(/\b([a-z0-9 ]+?)\s+flights?\b/);
  const candidate = fromMatch?.[1] ?? trailingMatch?.[1] ?? suffixMatch?.[1] ?? null;
  if (!candidate) return null;

  const words = candidate
    .split(' ')
    .filter((word) => word && !AIRLINE_QUERY_STOP_WORDS.has(word));

  if (words.length === 0) return null;
  if (words.some((word) => ['cheap', 'cheapest', 'fast', 'fastest', 'quick', 'quickest', 'baggage', 'bag', 'luggage', 'nonstop', 'direct', 'stop', 'stops', 'fare', 'price', 'cost', 'refundable', 'nonrefundable', 'non'].includes(word))) {
    return null;
  }

  return words.join(' ');
}

function flightMatchesAirline(
  flight: FlightListContext['flights'][number],
  requestedAirline: RequestedAirline,
): boolean {
  const searchableText = normalizeForMatching(`${flight.airline ?? ''} ${flight.rawText ?? ''}`);
  return requestedAirline.aliases.some((alias) =>
    hasNormalizedPhrase(searchableText, normalizeForMatching(alias)),
  );
}

function hasNormalizedPhrase(text: string, phrase: string): boolean {
  if (!text || !phrase) return false;
  return new RegExp(`(?:^| )${escapeRegExp(phrase)}(?: |$)`).test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function rankFlightsByPrice(flights: VisibleFlight[]): VisibleFlight[] {
  return flights
    .map((flight) => ({ flight, price: parsePriceAmount(flight.price ?? flight.rawText) }))
    .filter((item) => item.price !== null)
    .sort((a, b) => {
      if (a.price === null && b.price === null) return a.flight.index - b.flight.index;
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return a.price - b.price;
    })
    .map((item) => item.flight);
}

function rankFlightsByDuration(flights: VisibleFlight[]): VisibleFlight[] {
  return flights
    .map((flight) => ({ flight, minutes: parseDurationMinutes(flight.duration ?? flight.rawText) }))
    .filter((item) => item.minutes !== null)
    .sort((a, b) => {
      if (a.minutes === null && b.minutes === null) return a.flight.index - b.flight.index;
      if (a.minutes === null) return 1;
      if (b.minutes === null) return -1;
      return a.minutes - b.minutes;
    })
    .map((item) => item.flight);
}

function rankFlightsByBaggage(flights: VisibleFlight[]): VisibleFlight[] {
  return flights
    .map((flight) => ({ flight, weight: parseBaggageWeight(flight.baggage ?? flight.rawText) }))
    .filter((item) => item.weight !== null)
    .sort((a, b) => {
      if (a.weight === null && b.weight === null) return a.flight.index - b.flight.index;
      if (a.weight === null) return 1;
      if (b.weight === null) return -1;
      return b.weight - a.weight;
    })
    .map((item) => item.flight);
}

function parsePriceAmount(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = value.replace(/,/g, '');
  const patterns = [
    /(?:USD|BDT|EUR|GBP|AED|SAR|INR|NPR|৳|\$|€|£)\s*([0-9]+(?:\.[0-9]+)?)/i,
    /([0-9]+(?:\.[0-9]+)?)\s*(?:USD|BDT|EUR|GBP|AED|SAR|INR|NPR|৳|\$|€|£)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

function getRequestedFareThreshold(
  query: string,
): { direction: 'above' | 'below'; amount: number } | null {
  const direction = /\b(?:above|over|greater\s+than|more\s+than|higher\s+than|at\s+least)\b/.test(query)
    ? 'above'
    : /\b(?:below|under|less\s+than|lower\s+than|at\s+most|cheaper\s+than)\b/.test(query)
      ? 'below'
      : null;

  if (!direction) return null;

  const amount = parsePriceAmount(query) ?? parseStandaloneAmount(query);
  if (amount === null) return null;

  return { direction, amount };
}

function parseStandaloneAmount(value: string): number | null {
  const matches = Array.from(value.replace(/,/g, '').matchAll(/\b\d+(?:\.\d+)?\b/g))
    .map((match) => Number(match[0]))
    .filter((amount) => Number.isFinite(amount));

  return matches.length > 0 ? Math.max(...matches) : null;
}

function parseDurationMinutes(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = value.toLowerCase();
  const hourMinute = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes))?/,
  );
  if (hourMinute) {
    return Math.round(Number(hourMinute[1]) * 60 + Number(hourMinute[2] ?? 0));
  }

  const minutes = normalized.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
  if (minutes) return Number(minutes[1]);

  return null;
}

function parseBaggageWeight(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = value.toLowerCase();
  const kgMatches = Array.from(normalized.matchAll(/(\d+(?:\.\d+)?)\s*kg\b/g));
  if (kgMatches.length > 0) {
    return Math.max(...kgMatches.map((match) => Number(match[1])));
  }

  const lbMatches = Array.from(
    normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)\b/g),
  );
  if (lbMatches.length > 0) {
    return Math.max(...lbMatches.map((match) => Number(match[1]) * 0.453592));
  }

  return null;
}

function getRequestedStopCount(query: string): number | null {
  if (/\b(?:non[-\s]?stop|direct|no\s+stops?)\b/.test(query)) return 0;
  if (/\bzero\s+stops?\b/.test(query)) return 0;

  const match = query.match(/\b(\d+)\s+stops?\b/);
  if (!match) return null;

  return Number(match[1]);
}

function parseStopsCount(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = value.toLowerCase();
  if (/\b(?:non[-\s]?stop|direct|no\s+stops?)\b/.test(normalized)) return 0;
  if (/\bzero\s+stops?\b/.test(normalized)) return 0;

  const stopMatch = normalized.match(/\b(\d+)\s+stops?\b/);
  if (stopMatch) return Number(stopMatch[1]);

  const layoverMatch = normalized.match(/\b(\d+)\s+layovers?\b/);
  if (layoverMatch) return Number(layoverMatch[1]);

  return null;
}
