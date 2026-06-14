import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Embeddings } from '@langchain/core/embeddings';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import FirecrawlApp from '@mendable/firecrawl-js';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LlmFactoryService } from '../../core/llm/llm-factory.service';
import { KnowledgeGraphExtractionService } from '../../core/retrieval/knowledge-graph-extraction.service';
import { KnowledgeGraphService } from '../../core/retrieval/knowledge-graph.service';
import { ProfileCompletionService } from '../profile-completion/profile-completion.service';
import { WebPageChunk } from './web-page-chunk.entity';
import { WebPage } from './web-page.entity';

const EMBED_BATCH_SIZE = 10;
const DEFAULT_CRAWL_MAX_PAGES = 30;
const MIN_MARKDOWN_LENGTH = 50;

export interface IngestedSiteSummary {
  webPageId: string;
  url: string;
  title: string;
  chunksCreated: number;
  pagesFetched: number;
  pagesFailed: number;
}

export interface WebPageIngestProgress {
  type: 'scanning';
  rootUrl: string;
  url: string;
}

interface FirecrawlDocument {
  url?: string;
  markdown?: string;
  metadata?: {
    sourceURL?: string;
    title?: string;
  };
}

interface FirecrawlCrawlResponse {
  success?: boolean;
  error?: string;
  data?: FirecrawlDocument[];
}

interface FirecrawlPage {
  url: string;
  title: string;
  markdown: string;
}

@Injectable()
export class WebPageService {
  private readonly logger = new Logger(WebPageService.name);
  private readonly embeddings: Embeddings;
  private firecrawl?: FirecrawlApp;

  constructor(
    @InjectRepository(WebPage)
    private readonly webPageRepo: Repository<WebPage>,
    @InjectRepository(WebPageChunk)
    private readonly chunkRepo: Repository<WebPageChunk>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly llmFactory: LlmFactoryService,
    private readonly profileCompletionService: ProfileCompletionService,
    private readonly knowledgeGraphExtractionService: KnowledgeGraphExtractionService,
    private readonly knowledgeGraphService: KnowledgeGraphService,
  ) {
    this.embeddings = this.llmFactory.getEmbeddings();
  }

  private getCrawlMaxPages(): number {
    const configured = this.config.get<number>('web.crawlMaxPages');
    return Math.min(
      DEFAULT_CRAWL_MAX_PAGES,
      Math.max(1, configured ?? DEFAULT_CRAWL_MAX_PAGES),
    );
  }

  private requireCrawlUrl(url: string): string {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Unsupported protocol');
      }

      parsed.hash = '';
      return parsed.toString();
    } catch {
      throw new BadRequestException(`Invalid crawlable URL: ${url}`);
    }
  }

  private getFirecrawlClient(): FirecrawlApp {
    if (this.firecrawl) return this.firecrawl;

    const apiKey = this.config.get<string>('firecrawl.apiKey')?.trim();
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is required for web crawling');
    }

    this.firecrawl = new FirecrawlApp({ apiKey });
    return this.firecrawl;
  }

  private titleFromUrl(url: string): string {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split('/').filter(Boolean).pop();
    if (!lastSegment) return parsed.hostname;

    return lastSegment
      .replace(/\.[a-z0-9]+$/i, '')
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private sanitizeDbText(text: string): string {
    return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g, '');
  }

  private hasUsableMarkdown(markdown?: string): boolean {
    const md = markdown?.trim() ?? '';
    if (md.length < MIN_MARKDOWN_LENGTH) return false;

    const textOnly = md.replace(/!\[.*?\]\(.*?\)/g, '').trim();
    return textOnly.length >= MIN_MARKDOWN_LENGTH;
  }

  private async crawlPages(url: string, maxPages: number): Promise<FirecrawlPage[]> {
    const crawlOptions = {
      limit: maxPages,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: false,
        waitFor: 3000,
        excludeTags: [
          'nav',
          'footer',
          'header',
          'script',
          'style',
          'noscript',
          '[class*="cookie"]',
          '[class*="banner"]',
          '[class*="chat"]',
          '[class*="widget"]',
          '[id*="chat"]',
          '[id*="widget"]',
        ],
      },
      allowExternalLinks: false,
      ignoreSitemap: false,
    };
    const response = (await this.getFirecrawlClient().crawlUrl(
      url,
      crawlOptions as never,
    )) as FirecrawlCrawlResponse;

    if (response.success === false) {
      throw new Error(response.error ?? `Firecrawl crawl failed for ${url}`);
    }

    return (response.data ?? [])
      .filter((page) => this.hasUsableMarkdown(page.markdown))
      .map((page) => {
        const sourceUrl = page.metadata?.sourceURL ?? page.url ?? url;
        return {
          url: sourceUrl,
          title: page.metadata?.title ?? this.titleFromUrl(sourceUrl),
          markdown: page.markdown ?? '',
        };
      });
  }

  private async persistMarkdownChunks(
    page: WebPage,
    userId: string,
    sourceUrl: string,
    markdown: string,
    splitter: RecursiveCharacterTextSplitter,
    startChunkIndex: number,
  ): Promise<number> {
    const docs = await splitter.createDocuments([this.sanitizeDbText(markdown)]);
    this.logger.log(`Split "${sourceUrl}" into ${docs.length} chunks`);

    for (let i = 0; i < docs.length; i += EMBED_BATCH_SIZE) {
      const batch = docs.slice(i, i + EMBED_BATCH_SIZE);
      const vectors = await this.embeddings.embedDocuments(
        batch.map((doc) => doc.pageContent),
      );

      const chunks = batch.map((doc, j) =>
        this.chunkRepo.create({
          content: doc.pageContent,
          url: sourceUrl,
          chunkIndex: startChunkIndex + i + j,
          webPageId: page.id,
          userId,
          embedding: JSON.stringify(vectors[j]),
        }),
      );

      await this.chunkRepo.save(chunks);
      this.logger.log(
        `Embedded batch ${Math.floor(i / EMBED_BATCH_SIZE) + 1}/${Math.ceil(docs.length / EMBED_BATCH_SIZE)} for ${sourceUrl}`,
      );
    }

    return docs.length;
  }

  private async ingestIntoRecord(
    page: WebPage,
    userId: string,
    onProgress?: (event: WebPageIngestProgress) => void,
  ): Promise<WebPage> {
    const rootUrl = this.requireCrawlUrl(page.url);
    const pages = await this.crawlPages(rootUrl, this.getCrawlMaxPages());
    if (pages.length === 0) {
      throw new Error(`Firecrawl returned no pages with usable markdown for ${rootUrl}`);
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.get<number>('rag.chunkSize') ?? 1000,
      chunkOverlap: this.config.get<number>('rag.chunkOverlap') ?? 200,
    });

    let chunksCreated = 0;
    for (const crawledPage of pages) {
      onProgress?.({ type: 'scanning', rootUrl, url: crawledPage.url });
      chunksCreated += await this.persistMarkdownChunks(
        page,
        userId,
        crawledPage.url,
        crawledPage.markdown,
        splitter,
        chunksCreated,
      );
    }

    page.url = rootUrl;
    page.title = pages[0]?.title ?? new URL(rootUrl).hostname;
    page.chunksCreated = chunksCreated;
    page.pagesFetched = pages.length;
    page.pagesFailed = 0;

    this.logger.log(
      `Firecrawl ingested ${pages.length} page(s), created ${chunksCreated} chunks for ${rootUrl}`,
    );

    return this.webPageRepo.save(page);
  }

  async ingestUrl(
    url: string,
    userId: string,
    onProgress?: (event: WebPageIngestProgress) => void,
  ): Promise<IngestedSiteSummary> {
    const rootUrl = this.requireCrawlUrl(url);
    this.logger.log(`Ingesting URL with Firecrawl: ${rootUrl} for user ${userId}`);

    const page = this.webPageRepo.create({ url: rootUrl, userId });
    await this.webPageRepo.save(page);

    let saved: WebPage;
    try {
      saved = await this.ingestIntoRecord(page, userId, onProgress);
    } catch (err) {
      await this.webPageRepo.remove(page);
      throw err;
    }

    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );
    await this.profileCompletionService.refresh(userId);
    this.scheduleGraphIndexing(userId, saved.id, saved.url);

    return {
      webPageId: saved.id,
      url: saved.url,
      title: saved.title,
      chunksCreated: saved.chunksCreated,
      pagesFetched: saved.pagesFetched,
      pagesFailed: saved.pagesFailed,
    };
  }

  async refetchUrl(id: string, userId: string): Promise<IngestedSiteSummary> {
    const page = await this.findOne(id, userId);
    this.logger.log(`Refetching URL with Firecrawl: ${page.url} for user ${userId}`);

    await this.deleteGraphForWebPage(userId, id);
    await this.chunkRepo.delete({ webPageId: id });
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );

    const saved = await this.ingestIntoRecord(page, userId);
    this.scheduleGraphIndexing(userId, saved.id, saved.url);

    return {
      webPageId: saved.id,
      url: saved.url,
      title: saved.title,
      chunksCreated: saved.chunksCreated,
      pagesFetched: saved.pagesFetched,
      pagesFailed: saved.pagesFailed,
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
    await this.deleteGraphForWebPage(userId, id);
    await this.webPageRepo.remove(page);
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );
    await this.profileCompletionService.refresh(userId);
  }

  private scheduleGraphIndexing(userId: string, webPageId: string, url: string): void {
    void this.knowledgeGraphExtractionService
      .indexWebPageSource(userId, webPageId)
      .then((indexedChunks) => {
        this.logger.log(
          `Graph indexed ${indexedChunks} web page chunk(s) for ${url}`,
        );
      })
      .catch((err) => {
        this.logger.warn(
          `Graph indexing failed for ${url}; vector RAG remains available: ${(err as Error).message}`,
        );
      });
  }

  private async deleteGraphForWebPage(userId: string, webPageId: string): Promise<void> {
    try {
      await this.knowledgeGraphService.deleteSourceGraph(userId, 'web_page', webPageId);
    } catch (err) {
      this.logger.warn(
        `Failed to delete graph records for web page ${webPageId}: ${(err as Error).message}`,
      );
    }
  }
}
