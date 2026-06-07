import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tool } from '@langchain/core/tools';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { createAgent } from 'langchain';
import { z } from 'zod';
import type {
  FlightListContext,
  WidgetDomManipulation,
} from '../../features/chat/flight-list-context';
import type {
  ChatRedirectAction,
  ChatToolConfigResponse,
} from '../../features/chat-tools/chat-tools.types';
import { LlmFactoryService } from '../llm/llm-factory.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import {
  FlightSearchToolInput,
  ToolRetrievalService,
} from '../retrieval/tool-retrieval.service';
import {
  buildContextualToolQuery,
  type AgenticLoopResult,
  type Message,
} from './ai.types';
import { VisibleFlightAnalyzerService } from './visible-flights/visible-flight-analyzer.service';

@Injectable()
export class AgenticLoopService {
  private readonly logger = new Logger(AgenticLoopService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly llmFactory: LlmFactoryService,
    private readonly retrievalService: RetrievalService,
    private readonly toolRetrievalService: ToolRetrievalService,
    private readonly visibleFlightAnalyzer: VisibleFlightAnalyzerService,
  ) {}

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
    const imageUrls: { title: string; url: string }[] = [];
    const redirectActions: ChatRedirectAction[] = [];
    const domActions: WidgetDomManipulation[] = [];
    const usedToolKeys = new Set<string>();

    const searchKnowledgeBaseTool: any = tool(
      async ({ query }: { query: string }): Promise<string> => {
        this.logger.log(`Tool: search_knowledge_base("${query.slice(0, 80)}")`);
        const result = await this.retrievalService.searchKnowledgeBase(
          buildContextualToolQuery(query, history, userMessage, retrievalIntent),
          userId,
        );
        for (const block of result.split(/\n\n+/)) {
          const titleMatch = block.match(/^Title:\s*(.+)$/m);
          const urlMatch = block.match(/^URL:\s*(.+)$/m);
          if (titleMatch && urlMatch) {
            imageUrls.push({ title: titleMatch[1].trim(), url: urlMatch[1].trim() });
          }
        }
        return result;
      },
      {
        name: 'search_knowledge_base',
        description:
          'Search the full knowledge base for factual answers. This includes uploaded PDFs, ingested web pages, image descriptions, and optional entity-relationship graph evidence. ' +
          'Call this tool before answering any factual question about the knowledge base. ' +
          'You may call it multiple times with different focused queries for complex or multi-part questions.',
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
      searchKnowledgeBaseTool,
    ];
    const flightSearchConfig = chatToolConfigs.find(
      (config) => config.toolKey === 'flight_search' && config.enabled,
    );
    const liveAgentConfig = chatToolConfigs.find(
      (config) => config.toolKey === 'live_agent_contact' && config.enabled,
    );

    if (flightSearchConfig) {
      const cityToAirportTool: any = tool(
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

      const flightSearchTool: any = tool(
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

    if (flightListContext?.type === 'flight_list' && flightListContext.flights.length > 0) {
      const analyzeVisibleFlightsTool: any = tool(
        async ({ query }: { query: string }): Promise<string> => {
          this.logger.log(`Tool: analyze_visible_flights("${query.slice(0, 80)}")`);
          usedToolKeys.add('analyze_visible_flights');
          const result = await this.visibleFlightAnalyzer.analyzeVisibleFlightContext(
            query,
            flightListContext,
          );
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
            'Prefer this over flight_search whenever visible flight cards are supplied and the user request can be answered from those cards. ' +
            'Answers must use only the supplied visible flight JSON and must include the selected flight index when a single card is best.',
          schema: z.object({
            query: z.string().describe(
              'The user goal for the visible flight list, such as find cheapest flight, fastest flight, airline flights, refundable flights, or best baggage option.',
            ),
          }),
        },
      );

      tools.push(analyzeVisibleFlightsTool);
    }

    if (liveAgentConfig) {
      const liveAgentContactTool: any = tool(
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

    const llm = this.llmFactory.getChatModel();
    const chatHistory: BaseMessage[] = history.map((m) => {
      const text = m.parts.map((p) => p.text ?? '').join('');
      return m.role === 'user' ? new HumanMessage(text) : new AIMessage(text);
    });

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
        recursionLimit: maxIterations * 4,
      },
    );

    console.log('Agentic loop result:', result);

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

    const unescaped = output.replace(/\\n/g, '\n');

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
      '- If the user asks about the currently visible flight results, such as cheapest, fastest, best baggage, airline filters, best option, compare, rank, or select a flight, call analyze_visible_flights.',
      '- If the user asks to show visible flights for a specific airline or refundability, call analyze_visible_flights.',
      '- Prefer analyze_visible_flights over flight_search whenever the request can be answered from the visible flight cards.',
      '- For visible flight list answers, use only the flight JSON supplied by the widget.',
      '- If analyze_visible_flights returns a selectedFlight, describe that flight naturally and mention any missing details as unavailable.',
      '- Do not invent prices, baggage, routes, times, durations, or airlines that are not present in the visible flight data.',
    ].join('\n');
  }

  private restoreImageUrls(
    text: string,
    knownUrls: { title: string; url: string }[],
  ): string {
    if (knownUrls.length === 0) return text;

    return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt: string, url: string) => {
      if (knownUrls.some((k) => k.url === url)) return match;

      const byTitle = knownUrls.find(
        (k) =>
          k.title.toLowerCase() === alt.toLowerCase() ||
          alt.toLowerCase().includes(k.title.toLowerCase()) ||
          k.title.toLowerCase().includes(alt.toLowerCase()),
      );
      if (byTitle) {
        this.logger.warn(`Restored image URL for "${alt}": "${url}" -> "${byTitle.url}"`);
        return `![${alt}](${byTitle.url})`;
      }

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
        this.logger.warn(`Restored image URL by prefix for "${alt}": "${url}" -> "${byPrefix.url}"`);
        return `![${alt}](${byPrefix.url})`;
      }

      if (knownUrls.length === 1) {
        this.logger.warn(`Restored single image URL for "${alt}": "${url}" -> "${knownUrls[0].url}"`);
        return `![${alt}](${knownUrls[0].url})`;
      }

      return match;
    });
  }
}
