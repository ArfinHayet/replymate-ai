import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Embeddings } from '@langchain/core/embeddings';
import { LlmFactoryService } from '../../core/llm/llm-factory.service';
import { AiService } from '../../core/ai/ai.service';
import { DocumentChunk } from './document-chunk.entity';
import { Pdf } from './pdf.entity';
import { UpdatePdfDto } from './dto/update-pdf.dto';
import { ProfileCompletionService } from '../profile-completion/profile-completion.service';
import { KnowledgeGraphExtractionService } from '../../core/retrieval/knowledge-graph-extraction.service';
import { KnowledgeGraphService } from '../../core/retrieval/knowledge-graph.service';

// ─── Vercel limits ────────────────────────────────────────────────────────────
// Hobby  : 4.5 MB body, 10 s timeout, 1 GB RAM
// Pro    : 4.5 MB body (can raise to 5 MB in vercel.json), 60 s timeout, 3 GB RAM
// Workaround for body limit: upload to S3/Blob and pass a URL instead of raw bytes.
// For the timeout: keep embedding concurrency low and stream-save in batches.
const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4 MB — safe under Vercel's 4.5 MB body cap
const EMBED_BATCH_SIZE = 5;            // smaller batches → each API call is faster
const EMBED_CONCURRENCY = 3;           // run N batches in parallel to beat the clock
const AI_FALLBACK_MIN_BYTES = 100 * 1024;
const AI_FALLBACK_MIN_CHARS = 500;
const AI_FALLBACK_MIN_WORDS = 50;
const AI_FALLBACK_MAX_MALFORMED_RATIO = 0.25;

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly embeddings: Embeddings;

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
    @InjectRepository(Pdf)
    private readonly pdfRepo: Repository<Pdf>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly llmFactory: LlmFactoryService,
    private readonly aiService: AiService,
    private readonly profileCompletionService: ProfileCompletionService,
    private readonly knowledgeGraphExtractionService: KnowledgeGraphExtractionService,
    private readonly knowledgeGraphService: KnowledgeGraphService,
  ) {
    this.embeddings = this.llmFactory.getEmbeddings();
  }

  // ─── PDF → plain text ───────────────────────────────────────────────────────

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    // pdfjs-dist uses DOMMatrix (browser API) — polyfill for Node / Vercel.
    if (typeof (globalThis as Record<string, unknown>).DOMMatrix === 'undefined') {
      class DOMMatrixPolyfill {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        m11 = 1; m12 = 0; m13 = 0; m14 = 0;
        m21 = 0; m22 = 1; m23 = 0; m24 = 0;
        m31 = 0; m32 = 0; m33 = 1; m34 = 0;
        m41 = 0; m42 = 0; m43 = 0; m44 = 1;
        is2D = true; isIdentity = true;
        static fromMatrix() { return new DOMMatrixPolyfill(); }
        static fromFloat32Array() { return new DOMMatrixPolyfill(); }
        static fromFloat64Array() { return new DOMMatrixPolyfill(); }
        multiply() { return new DOMMatrixPolyfill(); }
        translate() { return new DOMMatrixPolyfill(); }
        scale() { return new DOMMatrixPolyfill(); }
        scaleNonUniform() { return new DOMMatrixPolyfill(); }
        scale3d() { return new DOMMatrixPolyfill(); }
        rotate() { return new DOMMatrixPolyfill(); }
        rotateFromVector() { return new DOMMatrixPolyfill(); }
        rotateAxisAngle() { return new DOMMatrixPolyfill(); }
        skewX() { return new DOMMatrixPolyfill(); }
        skewY() { return new DOMMatrixPolyfill(); }
        flipX() { return new DOMMatrixPolyfill(); }
        flipY() { return new DOMMatrixPolyfill(); }
        inverse() { return new DOMMatrixPolyfill(); }
        transformPoint(p: unknown) { return p ?? { x: 0, y: 0, z: 0, w: 1 }; }
        toFloat32Array() { return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
        toFloat64Array() { return new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
        toString() { return 'matrix(1, 0, 0, 1, 0, 0)'; }
      }
      (globalThis as Record<string, unknown>).DOMMatrix = DOMMatrixPolyfill;
    }

    // pdfjs-dist v4+ is pure ESM — dynamic import required.
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { pathToFileURL } = require('url') as typeof import('url');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodePath = require('path') as typeof import('path');
      const workerPath = nodePath.resolve(
        process.cwd(),
        'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      );
      pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    });
    const pdf = await loadingTask.promise;
    this.logger.log(`pdfjs: loaded ${pdf.numPages} pages`);

    // FIX 1: Parse pages concurrently instead of one-by-one.
    // For a 50-page PDF this alone saves several seconds on Vercel.
    const pagePromises = Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then(async (page) => {
        const tc = await page.getTextContent();
        return tc.items.map((item) => ('str' in item ? item.str : '')).join(' ');
      }),
    );
    const pageTexts = await Promise.all(pagePromises);
    return pageTexts.join('\n');
  }

  private shouldUseAiPdfExtraction(text: string, fileSizeBytes: number): boolean {
    const trimmed = text.trim();
    if (!trimmed) return true;

    if (
      fileSizeBytes > AI_FALLBACK_MIN_BYTES &&
      trimmed.length < AI_FALLBACK_MIN_CHARS
    ) {
      return true;
    }

    if (this.countAlphabeticWords(trimmed) < AI_FALLBACK_MIN_WORDS) {
      return true;
    }

    return this.malformedCharacterRatio(trimmed) > AI_FALLBACK_MAX_MALFORMED_RATIO;
  }

  private isUsablePdfText(text: string): boolean {
    const trimmed = text.trim();
    return (
      Boolean(trimmed) &&
      this.countAlphabeticWords(trimmed) > 0 &&
      this.malformedCharacterRatio(trimmed) <= AI_FALLBACK_MAX_MALFORMED_RATIO
    );
  }

  private countAlphabeticWords(text: string): number {
    return text.match(/[A-Za-z]{2,}/g)?.length ?? 0;
  }

  private malformedCharacterRatio(text: string): number {
    if (!text.length) return 1;
    const malformedPattern =
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]|[^A-Za-z0-9\s.,;:!?'"()[\]{}@#$%&*+=/_\\<>|-]/g;
    const malformedMatches = text.match(malformedPattern);
    return (malformedMatches?.length ?? 0) / text.length;
  }

  private async resolvePdfText(buffer: Buffer, fileName: string): Promise<string> {
    const pdfjsText = await this.extractTextFromPdf(buffer);
    if (!this.shouldUseAiPdfExtraction(pdfjsText, buffer.length)) {
      return pdfjsText;
    }

    this.logger.log(
      `pdfjs text looked empty or low quality; trying AI PDF extraction for ${fileName}`,
    );
    const aiText = await this.aiService.extractTextFromPdf(buffer, fileName);
    if (this.isUsablePdfText(aiText)) {
      return aiText;
    }

    if (pdfjsText.trim()) {
      this.logger.warn(
        `AI PDF extraction returned no usable text for ${fileName}; keeping pdfjs text`,
      );
      return pdfjsText;
    }

    return '';
  }

  // ─── Parallel embedding helper ──────────────────────────────────────────────

  /**
   * FIX 2: Embed chunks in parallel batches.
   *
   * The original code was fully sequential: embed batch 1, await, embed batch 2, await…
   * With EMBED_CONCURRENCY=3 we fire 3 API calls at the same time, which is 3× faster
   * and critical for staying under Vercel's 60 s function timeout on large PDFs.
   */
  private async embedInParallel(
    texts: string[],
  ): Promise<number[][]> {
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
      batches.push(texts.slice(i, i + EMBED_BATCH_SIZE));
    }

    const results = new Array<number[][]>(batches.length);

    // Process `EMBED_CONCURRENCY` batches at a time
    for (let start = 0; start < batches.length; start += EMBED_CONCURRENCY) {
      const window = batches.slice(start, start + EMBED_CONCURRENCY);
      const embeddings = await Promise.all(
        window.map((batch) => this.embeddings.embedDocuments(batch)),
      );
      embeddings.forEach((emb, idx) => { results[start + idx] = emb; });
      this.logger.log(
        `Embedded batches ${start + 1}–${Math.min(start + EMBED_CONCURRENCY, batches.length)} / ${batches.length}`,
      );
    }

    return results.flat();
  }

  // ─── Ingest ─────────────────────────────────────────────────────────────────

  async ingestPdf(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ message: string; fileName: string; chunksCreated: number; pdfId: string }> {
    // FIX 3: Reject oversized files early with a clear error instead of timing out.
    if (file.buffer.length > MAX_PDF_BYTES) {
      throw new PayloadTooLargeException(
        `PDF exceeds the ${MAX_PDF_BYTES / 1024 / 1024} MB limit. ` +
        `Please compress the file or split it into smaller parts.`,
      );
    }

    this.logger.log(`Ingesting: ${file.originalname} (${file.buffer.length} bytes) for user ${userId}`);

    const rawText = await this.resolvePdfText(file.buffer, file.originalname);
    if (!rawText?.trim()) {
      throw new BadRequestException(
        'This PDF does not contain extractable text. Please upload a text-based PDF, or a scanned PDF with readable pages so OCR can extract it.',
      );
    }

    // Strip null bytes — PostgreSQL UTF-8 rejects \x00.
    const cleanText = rawText.split('\0').join('');

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.get<number>('rag.chunkSize'),
      chunkOverlap: this.config.get<number>('rag.chunkOverlap'),
    });
    const docs = await splitter.createDocuments([cleanText]);
    this.logger.log(`Split into ${docs.length} chunks`);

    // Create the PDF record first so chunks can FK-reference it.
    const pdf = this.pdfRepo.create({ fileName: file.originalname, userId });
    await this.pdfRepo.save(pdf);

    // FIX 2 (continued): embed all chunks in parallel batches.
    const allTexts = docs.map((d) => d.pageContent);
    const allVectors = await this.embedInParallel(allTexts);

    // FIX 4: Build all chunk entities and save in one shot.
    // Multiple chunkRepo.save() calls inside a loop generate N round-trips to
    // the DB; a single bulk save is one round-trip and far faster on Vercel's
    // managed Postgres (which has non-trivial connection latency).
    const chunks: DocumentChunk[] = docs.map((doc, i) =>
      this.chunkRepo.create({
        content: doc.pageContent,
        fileName: file.originalname,
        chunkIndex: i,
        pdfId: pdf.id,
        userId,
        embedding: JSON.stringify(allVectors[i]),
      }),
    );

    // Save in DB-friendly batches to avoid hitting Postgres parameter limits
    // (max 65 535 bind params; a chunk entity with ~5 columns → safe up to ~13 k chunks).
    const DB_SAVE_BATCH = 500;
    for (let i = 0; i < chunks.length; i += DB_SAVE_BATCH) {
      await this.chunkRepo.save(chunks.slice(i, i + DB_SAVE_BATCH));
    }

    // Invalidate semantic cache — new documents may change answers to cached questions.
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );
    await this.profileCompletionService.refresh(userId);
    this.logger.log(`Cache invalidated for user ${userId}`);
    this.scheduleGraphIndexing(userId, pdf.id, file.originalname);

    return {
      message: 'PDF ingested successfully',
      fileName: file.originalname,
      chunksCreated: chunks.length,
      pdfId: pdf.id,
    };
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  findAllPdfs(userId: string): Promise<Pdf[]> {
    return this.pdfRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOnePdf(id: string, userId: string): Promise<Pdf> {
    const pdf = await this.pdfRepo.findOne({ where: { id, userId } });
    if (!pdf) throw new NotFoundException(`PDF ${id} not found`);
    return pdf;
  }

  async updatePdf(id: string, userId: string, dto: UpdatePdfDto): Promise<Pdf> {
    const pdf = await this.findOnePdf(id, userId);
    pdf.fileName = dto.fileName;
    return this.pdfRepo.save(pdf);
  }

  async deletePdf(id: string, userId: string): Promise<void> {
    const pdf = await this.findOnePdf(id, userId);
    await this.deleteGraphForPdf(userId, id);
    await this.pdfRepo.remove(pdf);
    await this.profileCompletionService.refresh(userId);
  }

  private scheduleGraphIndexing(userId: string, pdfId: string, fileName: string): void {
    void this.knowledgeGraphExtractionService
      .indexDocumentSource(userId, pdfId)
      .then((indexedChunks) => {
        this.logger.log(
          `Graph indexed ${indexedChunks} PDF chunk(s) for ${fileName}`,
        );
      })
      .catch((err) => {
        this.logger.warn(
          `Graph indexing failed for ${fileName}; vector RAG remains available: ${(err as Error).message}`,
        );
      });
  }

  private async deleteGraphForPdf(userId: string, pdfId: string): Promise<void> {
    try {
      await this.knowledgeGraphService.deleteSourceGraph(userId, 'document', pdfId);
    } catch (err) {
      this.logger.warn(
        `Failed to delete graph records for PDF ${pdfId}: ${(err as Error).message}`,
      );
    }
  }
}
