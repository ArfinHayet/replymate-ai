import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FirecrawlApp from '@mendable/firecrawl-js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestionService } from '../ingestion/ingestion.service';
import { CrawlJobEntity } from './crawl-job.entity';

const DEFAULT_MAX_PAGES = 30;
const MIN_MARKDOWN_LENGTH = 50;

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

export interface CrawlPage {
  url: string;
  title: string;
  markdown: string;
}

export interface CrawlResult {
  domain: string;
  totalPages: number;
  pages: CrawlPage[];
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private client?: FirecrawlApp;

  constructor(
    private readonly config: ConfigService,
    private readonly ingestionService: IngestionService,
    @InjectRepository(CrawlJobEntity)
    private readonly crawlJobRepo: Repository<CrawlJobEntity>,
  ) {}

  async crawlDomain(url: string, maxPages: number): Promise<CrawlResult> {
    const startUrl = this.requireHttpUrl(url);
    const domain = new URL(startUrl).hostname;
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
    const response = (await this.getClient().crawlUrl(
      startUrl,
      crawlOptions as never,
    )) as FirecrawlCrawlResponse;

    if (response.success === false) {
      throw new Error(response.error ?? `Firecrawl crawl failed for ${startUrl}`);
    }

    const pages = (response.data ?? [])
      .filter((page) => this.hasUsableMarkdown(page.markdown))
      .map((page) => {
        const pageUrl = page.metadata?.sourceURL ?? page.url ?? startUrl;
        return {
          url: pageUrl,
          title: page.metadata?.title ?? this.titleFromUrl(pageUrl),
          markdown: page.markdown ?? '',
        };
      });

    return { domain, totalPages: pages.length, pages };
  }

  async startCrawl(url: string, maxPages?: number): Promise<CrawlJobEntity> {
    const startUrl = this.requireHttpUrl(url);
    const job = this.crawlJobRepo.create({
      domain: new URL(startUrl).hostname,
      startUrl,
      status: 'pending',
    });
    await this.crawlJobRepo.save(job);

    void this.runCrawlJob(job.id, this.normalizeMaxPages(maxPages)).catch((err) => {
      this.logger.error(`Crawl job ${job.id} failed outside job handler`, err as Error);
    });

    return job;
  }

  async getJob(jobId: string): Promise<CrawlJobEntity> {
    const job = await this.crawlJobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Crawl job ${jobId} not found`);
    return job;
  }

  private async runCrawlJob(jobId: string, maxPages: number): Promise<void> {
    const job = await this.getJob(jobId);
    job.status = 'running';
    await this.crawlJobRepo.save(job);

    try {
      const result = await this.crawlDomain(job.startUrl, maxPages);
      job.pagesFound = result.totalPages;
      await this.crawlJobRepo.save(job);

      for (const page of result.pages) {
        const chunks = await this.ingestionService.ingestPage(
          { url: page.url, title: page.title, markdown: page.markdown },
          job.id,
          job.domain,
        );
        job.pagesIngested += 1;
        job.totalChunks += chunks;
        await this.crawlJobRepo.save(job);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      await this.crawlJobRepo.save(job);
    } catch (err) {
      job.status = 'failed';
      job.errorMessage = (err as Error).message;
      job.completedAt = new Date();
      await this.crawlJobRepo.save(job);
    }
  }

  private getClient(): FirecrawlApp {
    if (this.client) return this.client;

    const apiKey = this.config.get<string>('firecrawl.apiKey')?.trim();
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY is required for crawling');

    this.client = new FirecrawlApp({ apiKey });
    return this.client;
  }

  private hasUsableMarkdown(markdown?: string): boolean {
    const md = markdown?.trim() ?? '';
    if (md.length < MIN_MARKDOWN_LENGTH) return false;

    const textOnly = md.replace(/!\[.*?\]\(.*?\)/g, '').trim();
    return textOnly.length >= MIN_MARKDOWN_LENGTH;
  }

  private requireHttpUrl(url: string): string {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Unsupported protocol');
      }

      parsed.hash = '';
      return parsed.toString();
    } catch {
      throw new BadRequestException(`Invalid crawl URL: ${url}`);
    }
  }

  private normalizeMaxPages(maxPages?: number): number {
    return Math.max(1, Math.min(maxPages ?? DEFAULT_MAX_PAGES, DEFAULT_MAX_PAGES));
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
}
