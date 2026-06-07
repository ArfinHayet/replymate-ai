import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Embeddings } from '@langchain/core/embeddings';
import { LlmFactoryService } from '../llm/llm-factory.service';
import { HybridRetrievalService } from './hybrid-retrieval.service';
import { KnowledgeGraphService } from './knowledge-graph.service';

export interface RetrievedChunk {
  content: string;
  fileName: string;
  distance: number;
}

/** Cosine distance above which a chunk is considered irrelevant */
const DOC_THRESHOLD = 0.7;
const LEXICAL_STOP_WORDS = new Set([
  'and',
  'are',
  'can',
  'condition',
  'conditions',
  'current',
  'for',
  'from',
  'question',
  'recent',
  'the',
  'this',
  'tool',
  'user',
  'what',
  'with',
]);

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);
  private readonly embeddings: Embeddings;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly llmFactory: LlmFactoryService,
    private readonly hybridRetrievalService: HybridRetrievalService,
    private readonly knowledgeGraphService: KnowledgeGraphService,
  ) {
    this.embeddings = this.llmFactory.getEmbeddings();
  }

  /**
   * Unified knowledge-base retrieval for agentic chat.
   * This is backward compatible with the old vector RAG path: graph evidence is
   * included when available, and silently omitted when a user has no graph data.
   */
  async searchKnowledgeBase(query: string, userId: string): Promise<string> {
    return this.hybridRetrievalService.searchKnowledgeBase(query, userId);
  }

  /**
   * MCP tool executor - called when the chat model issues a
   * search_documents function call.
   *
   * Embeds the query, runs pgvector cosine search, and returns relevant
   * chunks as a plain string. The result is sent back to the model as a
   * function_response message - it never touches the system prompt.
   */
  async searchDocuments(query: string, userId: string): Promise<string> {
    this.logger.log(`Tool call: search_documents("${query.slice(0, 80)}") for user ${userId}`);

    const queryVector = await this.embeddings.embedQuery(query);
    const topK = this.config.get<number>('rag.topK') ?? 15;

    const rows: { content: string; distance: string }[] =
      await this.dataSource.query(
        `SELECT content,
                (embedding::vector <=> $1::vector) AS distance
         FROM document_chunks
         WHERE "userId" = $3
         ORDER BY distance ASC
         LIMIT $2`,
        [JSON.stringify(queryVector), topK, userId],
      );

    const relevant = rows.filter(
      (r) => parseFloat(r.distance) < DOC_THRESHOLD,
    );

    if (relevant.length === 0) {
      this.logger.log(`No relevant chunks found for: "${query}"`);
      return 'No relevant documents found for this query.';
    }

    // Format results without internal filenames. The assistant should answer from
    // the content, not expose source document names to end users.
    return relevant
      .map(
        (r, i) =>
          `[Document Excerpt ${i + 1}]\n${r.content}`,
      )
      .join('\n\n');
  }

  /**
   * Returns true if any document_chunk exists within the distance threshold
   * for the given pre-computed embedding vector.
   * Used as a pre-flight guard so ChatService can short-circuit before
   * calling the LLM when the knowledge base is empty or irrelevant.
   */
  async hasRelevantChunks(vector: number[], userId: string): Promise<boolean> {
    const rows: { distance: string }[] = await this.dataSource.query(
      `SELECT (embedding::vector <=> $1::vector) AS distance
       FROM document_chunks
       WHERE "userId" = $2
       ORDER BY distance ASC
       LIMIT 1`,
      [JSON.stringify(vector), userId],
    );
    if (rows.length === 0) return false;
    return parseFloat(rows[0].distance) < DOC_THRESHOLD;
  }

  /**
   * Pre-flight guard across every knowledge source the agent can search.
   * Without this, web-only ingests can be skipped before search_web_pages runs.
   */
  async hasRelevantKnowledge(vector: number[], userId: string, query?: string): Promise<boolean> {
    const rows: { distance: string }[] = await this.dataSource.query(
      `SELECT distance
       FROM (
         SELECT (embedding::vector <=> $1::vector) AS distance
         FROM document_chunks
         WHERE "userId" = $2
         UNION ALL
         SELECT (embedding::vector <=> $1::vector) AS distance
         FROM web_page_chunks
         WHERE "userId" = $2
         UNION ALL
         SELECT (embedding::vector <=> $1::vector) AS distance
         FROM images
         WHERE "userId" = $2
       ) AS knowledge_distances
       ORDER BY distance ASC
       LIMIT 1`,
      [JSON.stringify(vector), userId],
    );
    const hasVectorKnowledge =
      rows.length > 0 && parseFloat(rows[0].distance) < DOC_THRESHOLD;
    if (hasVectorKnowledge) return true;

    return query
      ? this.knowledgeGraphService.hasGraphKnowledge(query, userId)
      : false;
  }

  /**
   * MCP tool executor for image knowledge base.
   * Embeds the query, runs pgvector cosine search on the images table,
   * and returns matching image titles + descriptions as a plain string.
   */
  async searchImages(query: string, userId: string): Promise<string> {
    this.logger.log(`Tool call: search_images("${query.slice(0, 80)}") for user ${userId}`);

    const queryVector = await this.embeddings.embedQuery(query);
    const topK = this.config.get<number>('rag.topK') ?? 15;

    const rows: { title: string; description: string; storage_url: string; distance: string }[] =
      await this.dataSource.query(
        `SELECT title, description, "storageUrl" AS storage_url,
                (embedding::vector <=> $1::vector) AS distance
         FROM images
         WHERE "userId" = $3
         ORDER BY distance ASC
         LIMIT $2`,
        [JSON.stringify(queryVector), topK, userId],
      );

    const relevant = rows.filter((r) => parseFloat(r.distance) < DOC_THRESHOLD);

    if (relevant.length === 0) {
      this.logger.log(`No relevant images found for: "${query}"`);
      return 'No relevant images found for this query.';
    }

    return relevant
      .map(
        (r, i) =>
          `[Image ${i + 1}]\nTitle: ${r.title}\nDescription: ${r.description}\nURL: ${r.storage_url}`,
      )
      .join('\n\n');
  }

  /**
   * MCP tool executor for web page knowledge base.
   * Embeds the query, runs pgvector cosine search on the web_page_chunks table,
   * and returns matching excerpts as a plain string.
   */
  async searchWebPages(query: string, userId: string): Promise<string> {
    this.logger.log(`Tool call: search_web_pages("${query.slice(0, 80)}") for user ${userId}`);

    const queryVector = await this.embeddings.embedQuery(query);
    const topK = this.config.get<number>('rag.topK') ?? 15;

    const rows: { content: string; url: string; distance: string }[] =
      await this.dataSource.query(
        `SELECT content, url,
                (embedding::vector <=> $1::vector) AS distance
         FROM web_page_chunks
         WHERE "userId" = $3
         ORDER BY distance ASC
         LIMIT $2`,
        [JSON.stringify(queryVector), topK, userId],
      );

    const relevant = rows.filter((r) => parseFloat(r.distance) < DOC_THRESHOLD);

    if (relevant.length === 0) {
      const lexicalRows = await this.searchWebPagesLexically(query, userId, topK);
      if (lexicalRows.length > 0) {
        this.logger.log(`Lexical web page fallback found ${lexicalRows.length} chunk(s) for: "${query}"`);
        return this.formatWebPageRows(lexicalRows);
      }

      this.logger.log(`No relevant web page chunks found for: "${query}"`);
      return 'No relevant web page content found for this query.';
    }

    return this.formatWebPageRows(relevant);
  }

  private formatWebPageRows(rows: { content: string; url: string }[]): string {
    return rows
      .map(
        (r, i) =>
          `[Web Page Excerpt ${i + 1} - ${r.url}]\n${r.content}`,
      )
      .join('\n\n');
  }

  private getLexicalSearchTerms(query: string): string[] {
    const tokens = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter(
        (token) =>
          token.length >= 3 &&
          !LEXICAL_STOP_WORDS.has(token) &&
          !/^\d+$/.test(token),
      );

    return [...new Set(tokens)].slice(0, 8);
  }

  private async searchWebPagesLexically(
    query: string,
    userId: string,
    topK: number,
  ): Promise<{ content: string; url: string }[]> {
    const terms = this.getLexicalSearchTerms(query);
    if (terms.length === 0) return [];

    const params: unknown[] = [userId, topK];
    const conditions = terms.map((term, index) => {
      params.push(`%${term}%`);
      const paramIndex = index + 3;
      return `(content ILIKE $${paramIndex} OR url ILIKE $${paramIndex})`;
    });

    return this.dataSource.query(
      `SELECT content, url
       FROM web_page_chunks
       WHERE "userId" = $1
         AND (${conditions.join(' OR ')})
       ORDER BY
         CASE
           WHEN content ILIKE '%Terms and Condition%' THEN 0
           WHEN content ILIKE '%Privacy Policy%' THEN 1
           WHEN content ILIKE '%Refund Policy%' OR content ILIKE '%Return Policy%' THEN 2
           ELSE 3
         END,
         "chunkIndex" ASC
       LIMIT $2`,
      params,
    );
  }
}
