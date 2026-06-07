import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { KnowledgeGraphExtractionService } from './knowledge-graph-extraction.service';

export type KnowledgeGraphBackfillResult = {
  documentSources: number;
  webPageSources: number;
  indexedChunks: number;
};

@Injectable()
export class KnowledgeGraphBackfillService {
  private readonly logger = new Logger(KnowledgeGraphBackfillService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly extractionService: KnowledgeGraphExtractionService,
  ) {}

  async backfillUser(userId: string, perSourceChunkLimit?: number): Promise<KnowledgeGraphBackfillResult> {
    const documentSources: { pdfId: string }[] = await this.dataSource.query(
      `SELECT DISTINCT "pdfId"
       FROM document_chunks
       WHERE "userId" = $1 AND "pdfId" IS NOT NULL`,
      [userId],
    );
    const webPageSources: { webPageId: string }[] = await this.dataSource.query(
      `SELECT DISTINCT "webPageId"
       FROM web_page_chunks
       WHERE "userId" = $1 AND "webPageId" IS NOT NULL`,
      [userId],
    );

    let indexedChunks = 0;
    for (const source of documentSources) {
      try {
        indexedChunks += await this.extractionService.indexDocumentSource(
          userId,
          source.pdfId,
          perSourceChunkLimit,
        );
      } catch (err) {
        this.logger.warn(
          `Graph backfill failed for PDF ${source.pdfId}: ${(err as Error).message}`,
        );
      }
    }

    for (const source of webPageSources) {
      try {
        indexedChunks += await this.extractionService.indexWebPageSource(
          userId,
          source.webPageId,
          perSourceChunkLimit,
        );
      } catch (err) {
        this.logger.warn(
          `Graph backfill failed for web page ${source.webPageId}: ${(err as Error).message}`,
        );
      }
    }

    return {
      documentSources: documentSources.length,
      webPageSources: webPageSources.length,
      indexedChunks,
    };
  }
}
