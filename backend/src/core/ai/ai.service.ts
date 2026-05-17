import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { createAgent } from 'langchain';
import { LlmFactoryService } from '../llm/llm-factory.service';
import { RetrievalService } from '../retrieval/retrieval.service';

const analyzeOutputSchema = z.object({
  title: z.string().describe('A concise title (5-10 words) for the image'),
  description: z.string().describe('A 2-3 sentence factual description of the image'),
});

/** History shape shared with ChatService */
export interface Message {
  role: 'user' | 'model';
  parts: { text?: string }[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly llmFactory: LlmFactoryService,
    private readonly retrievalService: RetrievalService,
  ) {}

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
  ): Promise<string> {
    const maxIterations = this.config.get<number>('rag.maxToolIterations') ?? 10;

    // ── 1. Tool definitions ───────────────────────────────────────────────────
    // Accumulate every {title, url} pair the search_images tool returns so we
    // can restore any URLs the LLM inadvertently mutates in its final answer.
    const imageUrls: { title: string; url: string }[] = [];

    const searchDocumentsTool = tool(
      async ({ query }: { query: string }): Promise<string> => {
        this.logger.log(`Tool: search_documents("${query.slice(0, 80)}")`);
        return this.retrievalService.searchDocuments(query, userId);
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
        const result = await this.retrievalService.searchImages(query, userId);
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
        return this.retrievalService.searchWebPages(query, userId);
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
      tools: [searchDocumentsTool, searchImagesTool, searchWebPagesTool],
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
    return this.restoreImageUrls(unescaped, imageUrls);
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

  /** Embed a text string using the configured embedding provider */
  async embedText(text: string): Promise<number[]> {
    return this.llmFactory.getEmbeddings().embedQuery(text);
  }
}
