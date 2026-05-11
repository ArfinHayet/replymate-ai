import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

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
  private readonly embeddings: GoogleGenerativeAIEmbeddings;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: this.config.get<string>('google.apiKey'),
      model: 'gemini-embedding-001',
    });
  }

  /**
   * MCP tool executor — called by GeminiService when the LLM issues a
   * search_documents function call.
   *
   * Embeds the query, runs pgvector cosine search, and returns relevant
   * chunks as a plain string. The result is sent back to Gemini as a
   * function_response message — it never touches the system prompt.
   */
  async searchDocuments(query: string): Promise<string> {
    this.logger.log(`Tool call: search_documents("${query.slice(0, 80)}")`);

    const queryVector = await this.embeddings.embedQuery(query);
    const topK = this.config.get<number>('rag.topK');

    const rows: { content: string; file_name: string; distance: string }[] =
      await this.dataSource.query(
        `SELECT content, "fileName" AS file_name,
                (embedding::vector <=> $1::vector) AS distance
         FROM document_chunks
         ORDER BY distance ASC
         LIMIT $2`,
        [JSON.stringify(queryVector), topK],
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
  async hasRelevantChunks(vector: number[]): Promise<boolean> {
    const rows: { distance: string }[] = await this.dataSource.query(
      `SELECT (embedding::vector <=> $1::vector) AS distance
       FROM document_chunks
       ORDER BY distance ASC
       LIMIT 1`,
      [JSON.stringify(vector)],
    );
    if (rows.length === 0) return false;
    return parseFloat(rows[0].distance) < DOC_THRESHOLD;
  }
}
