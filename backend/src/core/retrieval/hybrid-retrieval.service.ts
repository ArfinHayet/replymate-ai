import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Embeddings } from '@langchain/core/embeddings';
import { LlmFactoryService } from '../llm/llm-factory.service';
import { KnowledgeGraphService, type GraphEvidence } from './knowledge-graph.service';

type TextRow = { content: string; distance: string };
type WebRow = { content: string; url: string; distance?: string };
type ImageRow = {
  title: string;
  description: string;
  storage_url: string;
  distance: string;
};

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
export class HybridRetrievalService {
  private readonly logger = new Logger(HybridRetrievalService.name);
  private readonly embeddings: Embeddings;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly llmFactory: LlmFactoryService,
    private readonly knowledgeGraphService: KnowledgeGraphService,
  ) {
    this.embeddings = this.llmFactory.getEmbeddings();
  }

  async searchKnowledgeBase(query: string, userId: string): Promise<string> {
    this.logger.log(`Tool call: search_knowledge_base("${query.slice(0, 80)}") for user ${userId}`);

    const queryVector = await this.embeddings.embedQuery(query);
    const topK = this.config.get<number>('rag.topK') ?? 15;

    const [documentRows, webRows, imageRows, graphEvidence] = await Promise.all([
      this.searchDocumentRows(queryVector, userId, topK),
      this.searchWebRows(query, queryVector, userId, topK),
      this.searchImageRows(queryVector, userId, topK),
      this.knowledgeGraphService.searchRelatedEvidence(query, userId),
    ]);

    const sections = [
      this.formatGraphEvidence(graphEvidence),
      this.formatDocumentRows(documentRows),
      this.formatWebRows(webRows),
      this.formatImageRows(imageRows),
    ].filter(Boolean);

    if (sections.length === 0) {
      return 'No relevant knowledge base content found for this query.';
    }

    return sections.join('\n\n---\n\n');
  }

  private async searchDocumentRows(
    queryVector: number[],
    userId: string,
    topK: number,
  ): Promise<TextRow[]> {
    const rows: TextRow[] = await this.dataSource.query(
      `SELECT content,
              (embedding::vector <=> $1::vector) AS distance
       FROM document_chunks
       WHERE "userId" = $3
       ORDER BY distance ASC
       LIMIT $2`,
      [JSON.stringify(queryVector), topK, userId],
    );

    return rows.filter((row) => parseFloat(row.distance) < DOC_THRESHOLD);
  }

  private async searchWebRows(
    query: string,
    queryVector: number[],
    userId: string,
    topK: number,
  ): Promise<WebRow[]> {
    const rows: WebRow[] = await this.dataSource.query(
      `SELECT content, url,
              (embedding::vector <=> $1::vector) AS distance
       FROM web_page_chunks
       WHERE "userId" = $3
       ORDER BY distance ASC
       LIMIT $2`,
      [JSON.stringify(queryVector), topK, userId],
    );

    const relevant = rows.filter((row) => parseFloat(row.distance ?? '1') < DOC_THRESHOLD);
    if (relevant.length > 0) return relevant;

    return this.searchWebRowsLexically(query, userId, topK);
  }

  private async searchImageRows(
    queryVector: number[],
    userId: string,
    topK: number,
  ): Promise<ImageRow[]> {
    const rows: ImageRow[] = await this.dataSource.query(
      `SELECT title, description, "storageUrl" AS storage_url,
              (embedding::vector <=> $1::vector) AS distance
       FROM images
       WHERE "userId" = $3
       ORDER BY distance ASC
       LIMIT $2`,
      [JSON.stringify(queryVector), topK, userId],
    );

    return rows.filter((row) => parseFloat(row.distance) < DOC_THRESHOLD);
  }

  private formatGraphEvidence(rows: GraphEvidence[]): string {
    if (rows.length === 0) return '';

    return rows
      .slice(0, 10)
      .map(
        (row, index) =>
          `[Related Fact ${index + 1}]\n` +
          `${row.from} --${row.relationType}--> ${row.to}\n` +
          `Evidence: ${row.evidenceText}`,
      )
      .join('\n\n');
  }

  private formatDocumentRows(rows: TextRow[]): string {
    if (rows.length === 0) return '';

    return rows
      .map((row, index) => `[Document Excerpt ${index + 1}]\n${row.content}`)
      .join('\n\n');
  }

  private formatWebRows(rows: WebRow[]): string {
    if (rows.length === 0) return '';

    return rows
      .map((row, index) => `[Web Page Excerpt ${index + 1} - ${row.url}]\n${row.content}`)
      .join('\n\n');
  }

  private formatImageRows(rows: ImageRow[]): string {
    if (rows.length === 0) return '';

    return rows
      .map(
        (row, index) =>
          `[Image ${index + 1}]\nTitle: ${row.title}\nDescription: ${row.description}\nURL: ${row.storage_url}`,
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

  private async searchWebRowsLexically(
    query: string,
    userId: string,
    topK: number,
  ): Promise<WebRow[]> {
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
