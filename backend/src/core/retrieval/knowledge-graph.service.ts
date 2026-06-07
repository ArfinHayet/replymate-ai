import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { KnowledgeEntity } from './knowledge-entity.entity';
import {
  KnowledgeEntityMention,
  type KnowledgeSourceType,
} from './knowledge-entity-mention.entity';
import { KnowledgeRelation } from './knowledge-relation.entity';

export type KnowledgeGraphEntityInput = {
  name: string;
  type: string;
  aliases?: string[];
  description?: string;
  confidence?: number;
};

export type KnowledgeGraphRelationInput = {
  from: string;
  to: string;
  type: string;
  evidenceText: string;
  confidence?: number;
};

export type KnowledgeGraphSourceRef = {
  userId: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  sourceChunkId?: string | null;
  context: string;
};

export type GraphEvidence = {
  from: string;
  relationType: string;
  to: string;
  evidenceText: string;
  confidence: number;
  depth: number;
};

const MAX_ENTITY_MATCHES = 8;
const DEFAULT_GRAPH_DEPTH = 2;

@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  constructor(
    @InjectRepository(KnowledgeEntity)
    private readonly entityRepo: Repository<KnowledgeEntity>,
    @InjectRepository(KnowledgeEntityMention)
    private readonly mentionRepo: Repository<KnowledgeEntityMention>,
    @InjectRepository(KnowledgeRelation)
    private readonly relationRepo: Repository<KnowledgeRelation>,
    private readonly dataSource: DataSource,
  ) {}

  async upsertExtractedGraph(
    source: KnowledgeGraphSourceRef,
    entities: KnowledgeGraphEntityInput[],
    relations: KnowledgeGraphRelationInput[],
  ): Promise<void> {
    const validEntities = entities
      .map((entity) => ({
        ...entity,
        name: normalizeDisplayName(entity.name),
        type: normalizeLabel(entity.type || 'entity'),
        aliases: normalizeAliases(entity.aliases ?? []),
      }))
      .filter((entity) => entity.name.length >= 2);

    if (validEntities.length === 0) return;

    const byCanonical = new Map<string, KnowledgeEntity>();
    for (const entity of validEntities) {
      const saved = await this.upsertEntity(source.userId, entity);
      byCanonical.set(saved.canonicalName, saved);
      byCanonical.set(canonicalize(entity.name), saved);
      for (const alias of entity.aliases) {
        byCanonical.set(canonicalize(alias), saved);
      }

      await this.mentionRepo.save(
        this.mentionRepo.create({
          userId: source.userId,
          entityId: saved.id,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
          sourceChunkId: source.sourceChunkId ?? null,
          matchedText: entity.name,
          context: source.context.slice(0, 1200),
          confidence: clampConfidence(entity.confidence),
        }),
      );
    }

    const relationRecords = relations
      .map((relation) => {
        const from = byCanonical.get(canonicalize(relation.from));
        const to = byCanonical.get(canonicalize(relation.to));
        const relationType = normalizeLabel(relation.type);
        const evidenceText = relation.evidenceText?.trim();

        if (!from || !to || !relationType || !evidenceText) return null;
        if (from.id === to.id) return null;

        return this.relationRepo.create({
          userId: source.userId,
          fromEntityId: from.id,
          toEntityId: to.id,
          relationType,
          evidenceText: evidenceText.slice(0, 1600),
          sourceType: source.sourceType,
          sourceId: source.sourceId,
          sourceChunkId: source.sourceChunkId ?? null,
          confidence: clampConfidence(relation.confidence),
          metadata: {},
        });
      })
      .filter((record): record is KnowledgeRelation => Boolean(record));

    if (relationRecords.length > 0) {
      await this.relationRepo.save(relationRecords);
    }
  }

  async searchRelatedEvidence(
    query: string,
    userId: string,
    maxDepth = DEFAULT_GRAPH_DEPTH,
  ): Promise<GraphEvidence[]> {
    const seedIds = await this.findSeedEntityIds(query, userId);
    if (seedIds.length === 0) return [];

    const rows: Array<{
      from_name: string;
      relation_type: string;
      to_name: string;
      evidence_text: string;
      confidence: number | string;
      depth: number | string;
    }> = await this.dataSource.query(
      `WITH RECURSIVE graph AS (
         SELECT
           r.id,
           r."fromEntityId",
           r."toEntityId",
           r."relationType",
           r."evidenceText",
           r.confidence,
           1 AS depth,
           ARRAY[r.id] AS path
         FROM knowledge_relations r
         WHERE r."userId" = $1
           AND (r."fromEntityId" = ANY($2::uuid[]) OR r."toEntityId" = ANY($2::uuid[]))

         UNION ALL

         SELECT
           r.id,
           r."fromEntityId",
           r."toEntityId",
           r."relationType",
           r."evidenceText",
           r.confidence,
           graph.depth + 1 AS depth,
           graph.path || r.id AS path
         FROM knowledge_relations r
         JOIN graph ON (
           r."fromEntityId" = graph."toEntityId"
           OR r."toEntityId" = graph."fromEntityId"
           OR r."fromEntityId" = graph."fromEntityId"
           OR r."toEntityId" = graph."toEntityId"
         )
         WHERE r."userId" = $1
           AND graph.depth < $3
           AND NOT r.id = ANY(graph.path)
       )
       SELECT DISTINCT ON (graph.id)
         from_entity.name AS from_name,
         graph."relationType" AS relation_type,
         to_entity.name AS to_name,
         graph."evidenceText" AS evidence_text,
         graph.confidence,
         graph.depth
       FROM graph
       JOIN knowledge_entities from_entity ON from_entity.id = graph."fromEntityId"
       JOIN knowledge_entities to_entity ON to_entity.id = graph."toEntityId"
       ORDER BY graph.id, graph.depth ASC, graph.confidence DESC
       LIMIT 20`,
      [userId, seedIds, Math.max(1, Math.min(3, maxDepth))],
    );

    return rows
      .map((row) => ({
        from: row.from_name,
        relationType: row.relation_type,
        to: row.to_name,
        evidenceText: row.evidence_text,
        confidence: Number(row.confidence),
        depth: Number(row.depth),
      }))
      .sort((a, b) => a.depth - b.depth || b.confidence - a.confidence);
  }

  async hasGraphKnowledge(query: string, userId: string): Promise<boolean> {
    const seedIds = await this.findSeedEntityIds(query, userId, 1);
    return seedIds.length > 0;
  }

  async deleteSourceGraph(
    userId: string,
    sourceType: KnowledgeSourceType,
    sourceId: string,
  ): Promise<void> {
    await this.relationRepo.delete({ userId, sourceType, sourceId });
    await this.mentionRepo.delete({ userId, sourceType, sourceId });
    await this.pruneUnmentionedEntities(userId);
  }

  private async upsertEntity(
    userId: string,
    input: KnowledgeGraphEntityInput & { name: string; type: string; aliases: string[] },
  ): Promise<KnowledgeEntity> {
    const canonicalName = canonicalize(input.name);
    const existing = await this.entityRepo.findOne({
      where: { userId, type: input.type, canonicalName },
    });

    if (existing) {
      existing.aliases = normalizeAliases([
        ...(existing.aliases ?? []),
        ...input.aliases,
        input.name,
      ]);
      existing.description = mergeDescription(existing.description, input.description);
      return this.entityRepo.save(existing);
    }

    return this.entityRepo.save(
      this.entityRepo.create({
        userId,
        type: input.type,
        name: input.name,
        canonicalName,
        aliases: normalizeAliases(input.aliases),
        description: input.description?.trim() ?? '',
        embedding: null,
        metadata: {},
      }),
    );
  }

  private async findSeedEntityIds(
    query: string,
    userId: string,
    limit = MAX_ENTITY_MATCHES,
  ): Promise<string[]> {
    const terms = getEntitySearchTerms(query);
    if (terms.length === 0) return [];

    const params: unknown[] = [userId, limit];
    const conditions = terms.map((term, index) => {
      params.push(`%${term}%`);
      const paramIndex = index + 3;
      return `(
        e.name ILIKE $${paramIndex}
        OR e."canonicalName" ILIKE $${paramIndex}
        OR e.aliases::text ILIKE $${paramIndex}
      )`;
    });

    const rows: { id: string }[] = await this.dataSource.query(
      `SELECT e.id
       FROM knowledge_entities e
       WHERE e."userId" = $1
         AND (${conditions.join(' OR ')})
       ORDER BY
         CASE
           WHEN e."canonicalName" = $3 THEN 0
           WHEN e.name ILIKE $3 THEN 1
           ELSE 2
         END,
         e."updatedAt" DESC
       LIMIT $2`,
      params,
    );

    return rows.map((row) => row.id);
  }

  private async pruneUnmentionedEntities(userId: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM knowledge_entities e
       WHERE e."userId" = $1
         AND NOT EXISTS (
           SELECT 1 FROM knowledge_entity_mentions m
           WHERE m."entityId" = e.id AND m."userId" = $1
         )`,
      [userId],
    );
  }
}

function canonicalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(ltd|limited|inc|llc|corp|corporation|company|co)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDisplayName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function normalizeAliases(values: string[]): string[] {
  return [...new Set(values.map(normalizeDisplayName).filter((value) => value.length >= 2))]
    .slice(0, 12);
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function mergeDescription(current: string | undefined, next: string | undefined): string {
  const cleanNext = next?.trim();
  if (!cleanNext) return current ?? '';
  if (!current?.trim()) return cleanNext.slice(0, 500);
  if (current.toLowerCase().includes(cleanNext.toLowerCase())) return current;
  return `${current} ${cleanNext}`.slice(0, 500);
}

function getEntitySearchTerms(query: string): string[] {
  const quoted = [...query.matchAll(/"([^"]{2,80})"/g)].map((match) => match[1]);
  const titleLike = [...query.matchAll(/\b[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,5}/g)]
    .map((match) => match[0])
    .filter((value) => value.length >= 3);
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !ENTITY_STOP_WORDS.has(token));

  return [...new Set([...quoted, ...titleLike, ...tokens].map((term) => canonicalize(term) || term))]
    .filter((term) => term.length >= 3)
    .slice(0, 10);
}

const ENTITY_STOP_WORDS = new Set([
  'about',
  'address',
  'company',
  'contact',
  'current',
  'does',
  'email',
  'from',
  'have',
  'location',
  'office',
  'phone',
  'policy',
  'service',
  'their',
  'there',
  'what',
  'where',
  'which',
  'with',
]);
