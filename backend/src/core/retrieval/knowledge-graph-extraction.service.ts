import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { LlmFactoryService } from '../llm/llm-factory.service';
import {
  KnowledgeGraphService,
  type KnowledgeGraphEntityInput,
  type KnowledgeGraphRelationInput,
} from './knowledge-graph.service';
import type { KnowledgeSourceType } from './knowledge-entity-mention.entity';

type ChunkForGraph = {
  id: string;
  userId: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  content: string;
};

const extractionSchema = z.object({
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      aliases: z.array(z.string()).default([]),
      description: z.string().default(''),
      confidence: z.number().min(0).max(1).default(0.5),
    }),
  ).default([]),
  relations: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: z.string(),
      evidenceText: z.string(),
      confidence: z.number().min(0).max(1).default(0.5),
    }),
  ).default([]),
});

const GRAPH_CHUNK_CHAR_LIMIT = 3500;

@Injectable()
export class KnowledgeGraphExtractionService {
  private readonly logger = new Logger(KnowledgeGraphExtractionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly llmFactory: LlmFactoryService,
    private readonly knowledgeGraphService: KnowledgeGraphService,
  ) {}

  async indexDocumentSource(userId: string, pdfId: string, limit?: number): Promise<number> {
    await this.knowledgeGraphService.deleteSourceGraph(userId, 'document', pdfId);
    const rows: Array<{ id: string; content: string }> = await this.dataSource.query(
      `SELECT id, content
       FROM document_chunks
       WHERE "userId" = $1 AND "pdfId" = $2
       ORDER BY "chunkIndex" ASC
       LIMIT $3`,
      [userId, pdfId, this.getChunkLimit(limit)],
    );

    return this.indexChunks(
      rows.map((row) => ({
        id: row.id,
        userId,
        sourceType: 'document',
        sourceId: pdfId,
        content: row.content,
      })),
    );
  }

  async indexWebPageSource(userId: string, webPageId: string, limit?: number): Promise<number> {
    await this.knowledgeGraphService.deleteSourceGraph(userId, 'web_page', webPageId);
    const rows: Array<{ id: string; content: string }> = await this.dataSource.query(
      `SELECT id, content
       FROM web_page_chunks
       WHERE "userId" = $1 AND "webPageId" = $2
       ORDER BY "chunkIndex" ASC
       LIMIT $3`,
      [userId, webPageId, this.getChunkLimit(limit)],
    );

    return this.indexChunks(
      rows.map((row) => ({
        id: row.id,
        userId,
        sourceType: 'web_page',
        sourceId: webPageId,
        content: row.content,
      })),
    );
  }

  async indexChunks(chunks: ChunkForGraph[]): Promise<number> {
    let indexed = 0;
    for (const chunk of chunks) {
      const extracted = await this.extractChunkGraph(chunk.content);
      if (extracted.entities.length === 0) continue;

      await this.knowledgeGraphService.upsertExtractedGraph(
        {
          userId: chunk.userId,
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
          sourceChunkId: chunk.id,
          context: chunk.content,
        },
        extracted.entities,
        extracted.relations,
      );
      indexed += 1;
    }

    return indexed;
  }

  private async extractChunkGraph(content: string): Promise<{
    entities: KnowledgeGraphEntityInput[];
    relations: KnowledgeGraphRelationInput[];
  }> {
    const trimmed = content.trim();
    if (trimmed.length < 40) return { entities: [], relations: [] };

    const llm = this.llmFactory.getChatModel().withStructuredOutput(extractionSchema);
    const result = await llm.invoke([
      new HumanMessage(
        [
          'Extract a small knowledge graph from this knowledge-base excerpt.',
          'Return only entities and factual relations explicitly supported by the text.',
          'Entity types should be simple labels such as company, person, service, product, location, contact, policy, topic, date, or organization.',
          'Relation types should be short snake_case verbs such as offers, located_at, has_contact, has_policy, part_of, mentions, works_for, provides, requires, or related_to.',
          'Do not invent facts. Keep evidenceText as the exact sentence or phrase supporting the relation.',
          '',
          'Excerpt:',
          trimmed.slice(0, GRAPH_CHUNK_CHAR_LIMIT),
        ].join('\n'),
      ),
    ]);

    return {
      entities: (result.entities ?? []).slice(0, 12),
      relations: (result.relations ?? []).slice(0, 16),
    };
  }

  private getChunkLimit(limit?: number): number {
    const configured = this.config.get<number>('rag.graph.maxChunksPerSource') ?? 30;
    const value = limit ?? configured;
    return Math.max(1, Math.min(500, Number.isFinite(value) ? value : 30));
  }
}
