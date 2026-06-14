import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Embeddings } from '@langchain/core/embeddings';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmFactoryService } from '../../core/llm/llm-factory.service';
import { WebPageChunk } from '../web-page/web-page-chunk.entity';
import { WebPage } from '../web-page/web-page.entity';

const EMBED_BATCH_SIZE = 10;

export interface IngestPageInput {
  url: string;
  title: string;
  markdown: string;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly embeddings: Embeddings;

  constructor(
    @InjectRepository(WebPage)
    private readonly webPageRepo: Repository<WebPage>,
    @InjectRepository(WebPageChunk)
    private readonly chunkRepo: Repository<WebPageChunk>,
    private readonly config: ConfigService,
    private readonly llmFactory: LlmFactoryService,
  ) {
    this.embeddings = this.llmFactory.getEmbeddings();
  }

  async ingestPage(
    page: { url: string; title: string; markdown: string },
    jobId: string,
    domain: string,
  ): Promise<number> {
    const webPage = this.webPageRepo.create({
      url: page.url,
      title: page.title,
      pagesFetched: 1,
      pagesFailed: 0,
    });
    await this.webPageRepo.save(webPage);

    const chunks = await this.chunkMarkdown(page.markdown);
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const vectors = await this.embeddings.embedDocuments(batch);
      const entities = batch.map((content, j) =>
        this.chunkRepo.create({
          content,
          url: page.url,
          chunkIndex: i + j,
          webPageId: webPage.id,
          embedding: JSON.stringify(vectors[j]),
        }),
      );

      await this.chunkRepo.save(entities);
    }

    webPage.chunksCreated = chunks.length;
    await this.webPageRepo.save(webPage);

    this.logger.log(
      `Ingested ${chunks.length} chunk(s) for ${page.url} from ${domain} in crawl job ${jobId}`,
    );
    return chunks.length;
  }

  private async chunkMarkdown(markdown: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.get<number>('rag.chunkSize') ?? 1000,
      chunkOverlap: this.config.get<number>('rag.chunkOverlap') ?? 200,
    });
    const docs = await splitter.createDocuments([this.sanitizeDbText(markdown)]);
    return docs.map((doc) => doc.pageContent);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private sanitizeDbText(text: string): string {
    return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g, '');
  }
}
