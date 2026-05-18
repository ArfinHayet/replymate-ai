import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Embeddings } from '@langchain/core/embeddings';
import { LlmFactoryService } from '../llm/llm-factory.service';

export interface RetrievedChunk {
  content: string;
  fileName: string;
  distance: number;
}

/** Cosine distance above which a chunk is considered irrelevant */
const DOC_THRESHOLD = 0.7;

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);
  private readonly embeddings: Embeddings;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly llmFactory: LlmFactoryService,
  ) {
    this.embeddings = this.llmFactory.getEmbeddings();
  }

  /**
   * MCP tool executor — called when the chat model issues a
   * search_documents function call.
   *
   * Embeds the query, runs pgvector cosine search, and returns relevant
   * chunks as a plain string. The result is sent back to the model as a
   * function_response message — it never touches the system prompt.
   */
  async searchDocuments(query: string, userId: string): Promise<string> {
    this.logger.log(`Tool call: search_documents("${query.slice(0, 80)}") for user ${userId}`);

    const queryVector = await this.embeddings.embedQuery(query);
    const topK = this.config.get<number>('rag.topK');

    const rows: { content: string; file_name: string; distance: string }[] =
      await this.dataSource.query(
        `SELECT content, "fileName" AS file_name,
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

    // Format results as numbered excerpts — plain text, NOT injected into system prompt
    return relevant
      .map(
        (r, i) =>
          `[Excerpt ${i + 1} — ${r.file_name}]\n${r.content}`,
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
  async hasRelevantKnowledge(vector: number[], userId: string): Promise<boolean> {
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
    if (rows.length === 0) return false;
    return parseFloat(rows[0].distance) < DOC_THRESHOLD;
  }

  /**
   * MCP tool executor for image knowledge base.
   * Embeds the query, runs pgvector cosine search on the images table,
   * and returns matching image titles + descriptions as a plain string.
   */
  async searchImages(query: string, userId: string): Promise<string> {
    this.logger.log(`Tool call: search_images("${query.slice(0, 80)}") for user ${userId}`);

    const queryVector = await this.embeddings.embedQuery(query);
    const topK = this.config.get<number>('rag.topK');

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
    const topK = this.config.get<number>('rag.topK');

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
      this.logger.log(`No relevant web page chunks found for: "${query}"`);
      return 'No relevant web page content found for this query.';
    }

    return relevant
      .map(
        (r, i) =>
          `[Web Page Excerpt ${i + 1} — ${r.url}]\n${r.content}`,
      )
      .join('\n\n');
  }
}
