import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Embeddings } from '@langchain/core/embeddings';
import axios from 'axios';
import { LlmFactoryService } from '../../core/llm/llm-factory.service';
import { WebPage } from './web-page.entity';
import { WebPageChunk } from './web-page-chunk.entity';

const JINA_BASE = 'https://r.jina.ai/';

@Injectable()
export class WebPageService {
  private readonly logger = new Logger(WebPageService.name);
  private readonly embeddings: Embeddings;

  constructor(
    @InjectRepository(WebPage)
    private readonly webPageRepo: Repository<WebPage>,
    @InjectRepository(WebPageChunk)
    private readonly chunkRepo: Repository<WebPageChunk>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly llmFactory: LlmFactoryService,
  ) {
    this.embeddings = this.llmFactory.getEmbeddings();
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Fetches the URL via Jina Reader and returns { title, markdown }.
   * Jina returns the page as clean Markdown — no API key required.
   */
  private async fetchMarkdown(url: string): Promise<{ title: string; markdown: string }> {
    this.logger.log(`Fetching via Jina: ${url}`);
    const jinaUrl = `${JINA_BASE}${url}`;
    const { data } = await axios.get<string>(jinaUrl, {
      headers: { Accept: 'text/markdown' },
      timeout: 30_000,
    });

    // Jina prepends metadata lines like:
    //   Title: Page Title
    //   URL Source: https://...
    //   (blank line)
    //   # Markdown content...
    const lines = data.split('\n');
    let title = '';
    for (const line of lines) {
      const match = line.match(/^Title:\s*(.+)$/);
      if (match) {
        title = match[1].trim();
        break;
      }
    }
    if (!title) {
      // Fall back to first heading or URL hostname
      const headingLine = lines.find((l) => l.startsWith('# '));
      title = headingLine ? headingLine.replace(/^#+\s*/, '').trim() : new URL(url).hostname;
    }

    return { title, markdown: data };
  }

  /**
   * Core ingest logic: fetch, split, embed, persist.
   * Returns the saved WebPage record.
   */
  private async ingestIntoRecord(
    page: WebPage,
    userId: string,
  ): Promise<WebPage> {
    const { title, markdown } = await this.fetchMarkdown(page.url);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.get<number>('rag.chunkSize') ?? 1000,
      chunkOverlap: this.config.get<number>('rag.chunkOverlap') ?? 200,
    });
    const docs = await splitter.createDocuments([markdown]);
    this.logger.log(`Split "${page.url}" into ${docs.length} chunks`);

    const BATCH_SIZE = 10;
    const chunks: WebPageChunk[] = [];

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      const vectors = await this.embeddings.embedDocuments(
        batch.map((d) => d.pageContent),
      );
      for (let j = 0; j < batch.length; j++) {
        chunks.push(
          this.chunkRepo.create({
            content: batch[j].pageContent,
            url: page.url,
            chunkIndex: i + j,
            webPageId: page.id,
            userId,
            embedding: JSON.stringify(vectors[j]),
          }),
        );
      }
      this.logger.log(
        `Embedded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(docs.length / BATCH_SIZE)} for ${page.url}`,
      );
    }

    await this.chunkRepo.save(chunks);

    page.title = title;
    page.chunksCreated = chunks.length;
    return this.webPageRepo.save(page);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async ingestUrl(url: string, userId: string): Promise<{
    webPageId: string;
    url: string;
    title: string;
    chunksCreated: number;
  }> {
    this.logger.log(`Ingesting URL: ${url} for user ${userId}`);

    const page = this.webPageRepo.create({ url, userId });
    await this.webPageRepo.save(page);

    const saved = await this.ingestIntoRecord(page, userId);

    // Invalidate semantic cache — new content may change answers to cached questions
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );
    this.logger.log(`Cache invalidated for user ${userId}`);

    return {
      webPageId: saved.id,
      url: saved.url,
      title: saved.title,
      chunksCreated: saved.chunksCreated,
    };
  }

  async refetchUrl(id: string, userId: string): Promise<{
    webPageId: string;
    url: string;
    title: string;
    chunksCreated: number;
  }> {
    const page = await this.findOne(id, userId);
    this.logger.log(`Refetching URL: ${page.url} for user ${userId}`);

    // Delete old chunks for this page
    await this.chunkRepo.delete({ webPageId: id });

    // Invalidate semantic cache
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );

    const saved = await this.ingestIntoRecord(page, userId);
    return {
      webPageId: saved.id,
      url: saved.url,
      title: saved.title,
      chunksCreated: saved.chunksCreated,
    };
  }

  findAll(userId: string): Promise<WebPage[]> {
    return this.webPageRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<WebPage> {
    const page = await this.webPageRepo.findOne({ where: { id, userId } });
    if (!page) throw new NotFoundException(`Web page ${id} not found`);
    return page;
  }

  async deleteWebPage(id: string, userId: string): Promise<void> {
    const page = await this.findOne(id, userId);
    await this.webPageRepo.remove(page);
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );
  }
}
