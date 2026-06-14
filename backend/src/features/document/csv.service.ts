import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { parse } from 'csv-parse/sync';
import { Embeddings } from '@langchain/core/embeddings';
import { LlmFactoryService } from '../../core/llm/llm-factory.service';
import { CsvChunk } from './csv-chunk.entity';
import { Csv } from './csv.entity';
import { ProfileCompletionService } from '../profile-completion/profile-completion.service';

const MAX_CSV_BYTES = 10 * 1024 * 1024; // 10 MB
const EMBED_BATCH_SIZE = 5;
const EMBED_CONCURRENCY = 3;
const DB_SAVE_BATCH = 500;

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);
  private readonly embeddings: Embeddings;

  constructor(
    @InjectRepository(CsvChunk)
    private readonly chunkRepo: Repository<CsvChunk>,
    @InjectRepository(Csv)
    private readonly csvRepo: Repository<Csv>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly llmFactory: LlmFactoryService,
    private readonly profileCompletionService: ProfileCompletionService,
  ) {
    this.embeddings = this.llmFactory.getEmbeddings();
  }

  // ─── Row → text ─────────────────────────────────────────────────────────────

  /**
   * Format a CSV row as "col1: val1 | col2: val2 | ..." so the embedding
   * captures both field names and values. This is schema-agnostic — it works
   * for any set of columns.
   */
  private formatRow(row: Record<string, string>): string {
    return Object.entries(row)
      .map(([key, value]) => `${key}: ${value ?? ''}`)
      .join(' | ');
  }

  // ─── Parallel embedding helper ───────────────────────────────────────────────

  private async embedInParallel(texts: string[]): Promise<number[][]> {
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
      batches.push(texts.slice(i, i + EMBED_BATCH_SIZE));
    }

    const results = new Array<number[][]>(batches.length);

    for (let start = 0; start < batches.length; start += EMBED_CONCURRENCY) {
      const windowBatch = batches.slice(start, start + EMBED_CONCURRENCY);
      const embeddings = await Promise.all(
        windowBatch.map((batch) => this.embeddings.embedDocuments(batch)),
      );
      embeddings.forEach((emb, idx) => {
        results[start + idx] = emb;
      });
      this.logger.log(
        `Embedded batches ${start + 1}–${Math.min(start + EMBED_CONCURRENCY, batches.length)} / ${batches.length}`,
      );
    }

    return results.flat();
  }

  // ─── Ingest ──────────────────────────────────────────────────────────────────

  async ingestCsv(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ message: string; fileName: string; rowsIngested: number; csvId: string }> {
    if (file.buffer.length > MAX_CSV_BYTES) {
      throw new BadRequestException(
        `CSV exceeds the ${MAX_CSV_BYTES / 1024 / 1024} MB limit.`,
      );
    }

    this.logger.log(`Ingesting CSV: ${file.originalname} (${file.buffer.length} bytes) for user ${userId}`);

    // Parse CSV — columns:true uses the header row as property keys
    let rows: Record<string, string>[];
    try {
      rows = parse(file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as Record<string, string>[];
    } catch (err) {
      throw new BadRequestException(
        `Could not parse CSV file: ${(err as Error).message}`,
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException('The CSV file contains no data rows.');
    }

    const headers = Object.keys(rows[0]);
    if (headers.length === 0) {
      throw new BadRequestException('The CSV file has no column headers.');
    }

    // Strip null bytes from all values (PostgreSQL UTF-8 rejects \x00)
    const cleanRows = rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, (v ?? '').split('\0').join('')]),
      ),
    );

    const rowTexts = cleanRows.map((row) => this.formatRow(row));

    // Create the Csv parent record first
    const csv = this.csvRepo.create({
      fileName: file.originalname,
      userId,
      rowCount: cleanRows.length,
      headers,
    });
    await this.csvRepo.save(csv);

    // Embed all rows in parallel batches
    const allVectors = await this.embedInParallel(rowTexts);

    // Build chunk entities
    const chunks: CsvChunk[] = cleanRows.map((_, i) =>
      this.chunkRepo.create({
        content: rowTexts[i],
        fileName: file.originalname,
        chunkIndex: i,
        csvId: csv.id,
        userId,
        embedding: JSON.stringify(allVectors[i]),
      }),
    );

    // Bulk-save in batches
    for (let i = 0; i < chunks.length; i += DB_SAVE_BATCH) {
      await this.chunkRepo.save(chunks.slice(i, i + DB_SAVE_BATCH));
    }

    // Invalidate semantic cache
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );
    await this.profileCompletionService.refresh(userId);
    this.logger.log(`CSV ingestion complete: ${cleanRows.length} rows for user ${userId}`);

    return {
      message: 'CSV ingested successfully',
      fileName: file.originalname,
      rowsIngested: cleanRows.length,
      csvId: csv.id,
    };
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  findAllCsvs(userId: string): Promise<Csv[]> {
    return this.csvRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOneCsv(id: string, userId: string): Promise<Csv> {
    const csv = await this.csvRepo.findOne({ where: { id, userId } });
    if (!csv) throw new NotFoundException(`CSV ${id} not found`);
    return csv;
  }

  async deleteCsv(id: string, userId: string): Promise<void> {
    const csv = await this.findOneCsv(id, userId);
    await this.csvRepo.remove(csv);
    await this.profileCompletionService.refresh(userId);
  }
}
