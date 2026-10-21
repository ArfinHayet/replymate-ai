import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tool } from '@langchain/core/tools';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { createAgent } from 'langchain';
import { z } from 'zod';
import { LlmFactoryService } from '../llm/llm-factory.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import {
  buildContextualToolQuery,
  type AgenticLoopResult,
  type Message,
} from './ai.types';

@Injectable()
export class AgenticLoopService {
  private readonly logger = new Logger(AgenticLoopService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly llmFactory: LlmFactoryService,
    private readonly retrievalService: RetrievalService,
  ) {}

  async runAgenticLoop(
    systemPrompt: string,
    history: Message[],
    userMessage: string,
    userId: string,
    retrievalIntent?: string,
  ): Promise<AgenticLoopResult> {
    const maxIterations = this.config.get<number>('rag.maxToolIterations') ?? 10;
    const imageUrls: { title: string; url: string }[] = [];

    const searchDocumentsTool = tool(
      async ({ query }: { query: string }): Promise<string> => {
        this.logger.log(`Tool: search_documents("${query.slice(0, 80)}")`);
        return this.retrievalService.searchDocuments(
          buildContextualToolQuery(query, history, userMessage, retrievalIntent),
          userId,
        );
      },
      {
        name: 'search_documents',
        description:
          'Search the uploaded PDF document knowledge base for content relevant to a query. ' +
          'Call this tool for every factual question before answering. ' +
          'You may call it multiple times with different queries for complex questions. ' +
          'Returns the most relevant document excerpts.',
        schema: z.object({
          query: z.string().describe(
            'A focused natural-language search query. For multi-part questions, break them into targeted queries.',
          ),
        }),
      },
    );

    const searchImagesTool = tool(
      async ({ query }: { query: string }): Promise<string> => {
        this.logger.log(`Tool: search_images("${query.slice(0, 80)}")`);
        const result = await this.retrievalService.searchImages(
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
        name: 'search_images',
        description:
          'Search the uploaded image knowledge base for images relevant to a query. ' +
          'Use this when the question may relate to visual content, photos, or images.',
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
          buildContextualToolQuery(query, history, userMessage, retrievalIntent),
          userId,
        );
      },
      {
        name: 'search_web_pages',
        description:
          'Search the ingested web page knowledge base for content relevant to a query. ' +
          'Call this for factual questions because web pages may contain up-to-date information.',
        schema: z.object({
          query: z.string().describe(
            'A focused natural-language search query for relevant ingested web page content.',
          ),
        }),
      },
    );

    const tools = [searchDocumentsTool, searchImagesTool, searchWebPagesTool];
    const llm = this.llmFactory.getChatModel();
    const chatHistory: BaseMessage[] = history.map((message) => {
      const text = message.parts.map((part) => part.text ?? '').join('');
      return message.role === 'user' ? new HumanMessage(text) : new AIMessage(text);
    });

    const agent = createAgent({ model: llm, tools, systemPrompt });
    const result = await agent.invoke(
      { messages: [...chatHistory, new HumanMessage(userMessage)] },
      { recursionLimit: maxIterations * 4 },
    );

    const lastMessage = result.messages.at(-1);
    let output = '';
    if (typeof lastMessage?.content === 'string') {
      output = lastMessage.content;
    } else if (Array.isArray(lastMessage?.content)) {
      output = (lastMessage.content as { type: string; text?: string }[])
        .filter((content) => content.type === 'text' && content.text)
        .map((content) => content.text!)
        .join('');
    }

    if (!output) throw new Error('Agent returned empty output');

    return {
      answer: this.restoreImageUrls(output.replace(/\\n/g, '\n'), imageUrls),
    };
  }

  private restoreImageUrls(
    text: string,
    knownUrls: { title: string; url: string }[],
  ): string {
    if (knownUrls.length === 0) return text;

    return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt: string, url: string) => {
      if (knownUrls.some((known) => known.url === url)) return match;

      const byTitle = knownUrls.find(
        (known) =>
          known.title.toLowerCase() === alt.toLowerCase() ||
          alt.toLowerCase().includes(known.title.toLowerCase()) ||
          known.title.toLowerCase().includes(alt.toLowerCase()),
      );
      if (byTitle) {
        this.logger.warn(`Restored image URL for "${alt}": "${url}" -> "${byTitle.url}"`);
        return `![${alt}](${byTitle.url})`;
      }

      const byPrefix = knownUrls.find((known) => {
        const knownBase = known.url.split('?')[0];
        const givenBase = url.split('?')[0];
        return (
          knownBase === givenBase ||
          knownBase.startsWith(givenBase) ||
          givenBase.startsWith(knownBase)
        );
      });
      if (byPrefix) {
        this.logger.warn(`Restored image URL by prefix: "${url}" -> "${byPrefix.url}"`);
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
