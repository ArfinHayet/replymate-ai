import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Embeddings } from '@langchain/core/embeddings';
import { LlmFactoryService } from '../../core/llm/llm-factory.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> } };
import { DocumentChunk } from './document-chunk.entity';
import { Pdf } from './pdf.entity';
import { UpdatePdfDto } from './dto/update-pdf.dto';

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
  ) {
    this.embeddings = this.llmFactory.getEmbeddings();
  }

  async ingestPdf(file: Express.Multer.File, userId: string): Promise<{
    message: string;
    fileName: string;
    chunksCreated: number;
    pdfId: string;
  }> {
    this.logger.log(`Ingesting: ${file.originalname} for user ${userId}`);

    const parsed = await new PDFParse({ data: file.buffer }).getText();
    if (!parsed.text?.trim()) throw new Error('PDF contains no extractable text');

    // Strip null bytes (\x00) that PDF parsers embed for icons/special chars —
    // PostgreSQL UTF-8 encoding rejects them.
    const cleanText = parsed.text.replace(/\x00/g, '');

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.get<number>('rag.chunkSize'),
      chunkOverlap: this.config.get<number>('rag.chunkOverlap'),
    });
    const docs = await splitter.createDocuments([cleanText]);
    this.logger.log(`Split into ${docs.length} chunks`);

    // Create the PDF record first so chunks can reference it
    const pdf = this.pdfRepo.create({ fileName: file.originalname, userId });
    await this.pdfRepo.save(pdf);

    const BATCH_SIZE = 10;
    const chunks: DocumentChunk[] = [];

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      const vectors = await this.embeddings.embedDocuments(
        batch.map((d) => d.pageContent),
      );
      for (let j = 0; j < batch.length; j++) {
        chunks.push(
          this.chunkRepo.create({
            content: batch[j].pageContent,
            fileName: file.originalname,
            chunkIndex: i + j,
            pdfId: pdf.id,
            userId,
            embedding: JSON.stringify(vectors[j]),
          }),
        );
      }
      this.logger.log(
        `Embedded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(docs.length / BATCH_SIZE)}`,
      );
    }

    await this.chunkRepo.save(chunks);

    // Invalidate semantic cache — new documents may change answers to cached questions
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );
    this.logger.log(`Cache invalidated for user ${userId}`);

    return {
      message: 'PDF ingested successfully',
      fileName: file.originalname,
      chunksCreated: chunks.length,
      pdfId: pdf.id,
    };
  }

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
    await this.pdfRepo.remove(pdf);
  }
}
