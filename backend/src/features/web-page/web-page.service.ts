import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Embeddings } from '@langchain/core/embeddings';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { LlmFactoryService } from '../../core/llm/llm-factory.service';
import { WebPage } from './web-page.entity';
import { WebPageChunk } from './web-page-chunk.entity';

const JINA_BASE = 'https://r.jina.ai/';
const SCRAPINGANT_EXTENDED_ENDPOINT = 'https://api.scrapingant.com/v2/extended';
const EMBED_BATCH_SIZE = 10;
const DEFAULT_CRAWL_MAX_PAGES = 30;
const DEFAULT_SCRAPINGANT_TIMEOUT_SECONDS = 30;
const DEFAULT_SCRAPINGANT_MAX_PAGES_PER_INGEST = 10;
const DISCOVERY_TIMEOUT_MS = 15_000;
const READABLE_TEXT_MIN_LENGTH = 80;
const COMMON_SITEMAP_PATHS = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml'];
const CONTENT_API_KEYWORD_REGEX = /(api|content|page|post|article|cms|about|contact|terms|policy|faq|privacy|refund)/i;
const SCRAPINGANT_BLOCKED_RESOURCES = ['image', 'media', 'font', 'stylesheet'];
const HIGHEST_PRIORITY_SEGMENTS = [
  'product',
  'projects',
  'about',
  'contact',
  'contact-us',
  'privacy',
  'privacy-policy',
  'terms',
  'terms-condition',
  'terms-conditions',
  'faq',
  'help',
  'support',
  'cancellation',
  'category',
];
const HIGH_PRIORITY_SEGMENTS = [
  'refund',
  'return',
  'cancellation',
  'policy',
  'shipping',
  'pricing',
  'plans',
  'services',
  'mission',
  'vision',
];
const MEDIUM_PRIORITY_SEGMENTS = [
  'blog/contact-us',
  'company',
  'team',
  'careers',
  'legal',
];
const LOW_PRIORITY_SEGMENTS = [
  'blog',
  'news',
  'article',
  'articles',
  'tag',
  'archive',
  'search',
  'wp-json',
  'password',
  'signin',
  'signup'
];
const JSON_CONTENT_KEYS = new Set([
  'payload',
  'content',
  'body',
  'html',
  'description',
  'text',
  'title',
  'data',
]);
const STATIC_ASSET_EXTENSIONS = new Set([
  '.7z',
  '.avi',
  '.bmp',
  '.css',
  '.csv',
  '.doc',
  '.docx',
  '.eot',
  '.gif',
  '.gz',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.json',
  '.map',
  '.mov',
  '.mp3',
  '.mp4',
  '.mpeg',
  '.ogg',
  '.otf',
  '.pdf',
  '.png',
  '.ppt',
  '.pptx',
  '.rar',
  '.svg',
  '.tar',
  '.tgz',
  '.ttf',
  '.wav',
  '.webm',
  '.webp',
  '.woff',
  '.woff2',
  '.xls',
  '.xlsx',
  '.xml',
  '.zip',
]);

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

interface ReadablePageContent {
  title: string;
  markdown: string;
  scrapingAnt?: ScrapingAntExtendedResponse;
}

interface ScrapingAntConfig {
  apiKey: string;
  enabled: boolean;
  timeoutSeconds: number;
  maxPagesPerIngest: number;
}

interface ScrapingAntUsage {
  calls: number;
  credits: number;
}

interface ScrapingAntExtendedResponse {
  html?: unknown;
  text?: unknown;
  status_code?: unknown;
  xhrs?: unknown;
  iframes?: unknown;
}

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

  private getCrawlMaxPages(): number {
    const configured = this.config.get<number>('web.crawlMaxPages');
    return Math.min(
      DEFAULT_CRAWL_MAX_PAGES,
      Math.max(1, configured ?? DEFAULT_CRAWL_MAX_PAGES),
    );
  }

  private getScrapingAntConfig(): ScrapingAntConfig | null {
    const apiKey = this.config.get<string>('web.scrapingAnt.apiKey')?.trim();
    if (!apiKey) return null;

    const enabled = this.config.get<boolean>('web.scrapingAnt.enabled');
    if (enabled === false) return null;

    return {
      apiKey,
      enabled: true,
      timeoutSeconds: Math.min(
        60,
        Math.max(
          5,
          this.config.get<number>('web.scrapingAnt.timeoutSeconds') ??
            DEFAULT_SCRAPINGANT_TIMEOUT_SECONDS,
        ),
      ),
      maxPagesPerIngest: Math.max(
        0,
        Math.min(
          DEFAULT_SCRAPINGANT_MAX_PAGES_PER_INGEST,
          this.config.get<number>('web.scrapingAnt.maxPagesPerIngest') ??
            DEFAULT_SCRAPINGANT_MAX_PAGES_PER_INGEST,
        ),
      ),
    };
  }

  private normalizeCrawlUrl(url: string, baseUrl?: string): string | null {
    try {
      const parsed = baseUrl ? new URL(url, baseUrl) : new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

      parsed.hash = '';
      if (this.isStaticAssetPath(parsed.pathname)) return null;

      return parsed.toString();
    } catch {
      return null;
    }
  }

  private requireCrawlUrl(url: string): string {
    const normalized = this.normalizeCrawlUrl(url.trim());
    if (!normalized) throw new Error(`Invalid crawlable URL: ${url}`);
    return normalized;
  }

  private isStaticAssetPath(pathname: string): boolean {
    const lowerPath = pathname.toLowerCase();
    const lastSegment = lowerPath.split('/').pop() ?? '';
    const extension = lastSegment.match(/\.[a-z0-9]+$/)?.[0];
    return extension ? STATIC_ASSET_EXTENSIONS.has(extension) : false;
  }

  private getDomainKey(hostname: string): string {
    const normalized = hostname.toLowerCase();
    if (
      normalized === 'localhost' ||
      normalized.includes(':') ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)
    ) {
      return normalized;
    }

    const labels = normalized.split('.').filter(Boolean);
    return labels.length <= 2 ? normalized : labels.slice(-2).join('.');
  }

  private isSameDomain(rootUrl: string, candidateUrl: string): boolean {
    const root = new URL(rootUrl);
    const candidate = new URL(candidateUrl);
    const rootHost = root.hostname.toLowerCase();
    const candidateHost = candidate.hostname.toLowerCase();

    if (
      rootHost === 'localhost' ||
      candidateHost === 'localhost' ||
      rootHost.includes(':') ||
      candidateHost.includes(':') ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(rootHost) ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(candidateHost)
    ) {
      return rootHost === candidateHost;
    }

    return this.getDomainKey(rootHost) === this.getDomainKey(candidateHost);
  }

  private scoreCrawlUrl(url: string, rootUrl: string): number {
    const parsed = new URL(url);
    const root = new URL(rootUrl);
    if (parsed.toString() === root.toString()) return Number.MAX_SAFE_INTEGER;

    const path = parsed.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    const query = parsed.search.toLowerCase();
    const haystack = `${path}${query}`;
    const segmentMatches = (segments: string[]) =>
      segments.filter((segment) => haystack.includes(segment)).length;

    let score = 0;
    score += segmentMatches(HIGHEST_PRIORITY_SEGMENTS) * 1000;
    score += segmentMatches(HIGH_PRIORITY_SEGMENTS) * 700;
    score += segmentMatches(MEDIUM_PRIORITY_SEGMENTS) * 400;
    score -= segmentMatches(LOW_PRIORITY_SEGMENTS) * 250;

    if (/([?&])(page|p|offset)=\d+/i.test(query) || /\/page\/\d+/i.test(path)) {
      score -= 150;
    }
    if (query) score -= 25;

    return score;
  }

  private sortCrawlCandidates(urls: string[], rootUrl: string): string[] {
    return [...urls].sort((a, b) => {
      const scoreDelta = this.scoreCrawlUrl(b, rootUrl) - this.scoreCrawlUrl(a, rootUrl);
      if (scoreDelta !== 0) return scoreDelta;

      const aUrl = new URL(a);
      const bUrl = new URL(b);
      const lengthDelta =
        aUrl.pathname.length + aUrl.search.length - (bUrl.pathname.length + bUrl.search.length);
      if (lengthDelta !== 0) return lengthDelta;

      return a.localeCompare(b);
    });
  }

  private addNormalizedLink(
    links: Set<string>,
    rawHref: string,
    baseUrl: string,
    rootUrl: string,
  ): void {
    const href = this.decodeHtmlEntityUrl(rawHref.trim());
    if (!href || href.startsWith('#')) return;

    const normalized = this.normalizeCrawlUrl(href, baseUrl);
    if (!normalized || !this.isSameDomain(rootUrl, normalized)) return;

    links.add(normalized);
  }

  private decodeHtmlEntityUrl(url: string): string {
    return url
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'");
  }

  private extractMarkdownLinks(markdown: string, baseUrl: string, rootUrl: string): string[] {
    const links = new Set<string>();

    const markdownLinkRegex = /!?\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
    for (const match of markdown.matchAll(markdownLinkRegex)) {
      this.addNormalizedLink(links, match[1], baseUrl, rootUrl);
    }

    const htmlHrefRegex = /\bhref\s*=\s*["']([^"']+)["']/gi;
    for (const match of markdown.matchAll(htmlHrefRegex)) {
      this.addNormalizedLink(links, match[1], baseUrl, rootUrl);
    }

    return [...links];
  }

  private extractHtmlLinks(html: string, baseUrl: string, rootUrl: string): string[] {
    const links = new Set<string>();
    const htmlHrefRegex = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))/gi;

    for (const match of html.matchAll(htmlHrefRegex)) {
      const href = match[1] ?? match[2] ?? match[3] ?? '';
      this.addNormalizedLink(links, href, baseUrl, rootUrl);
    }

    return [...links];
  }

  private normalizeReadableText(text: string): string {
    return text
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private stripJinaMetadata(markdown: string): string {
    const lines = markdown.split('\n');
    let index = 0;

    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line) {
        index += 1;
        continue;
      }
      if (/^(Title|URL Source|Markdown Content):/i.test(line)) {
        index += 1;
        continue;
      }
      break;
    }

    return this.normalizeReadableText(lines.slice(index).join('\n'));
  }

  private isMeaningfulMarkdown(markdown: string): boolean {
    return this.stripJinaMetadata(markdown).length >= READABLE_TEXT_MIN_LENGTH;
  }

  private async fetchRawHtml(url: string): Promise<string | null> {
    try {
      const { data } = await axios.get<string>(url, {
        headers: { Accept: 'text/html' },
        timeout: DISCOVERY_TIMEOUT_MS,
      });
      return String(data);
    } catch (err) {
      this.logger.warn(
        `Failed to fetch raw HTML for "${url}": ${(err as Error).message}`,
      );
      return null;
    }
  }

  private htmlToReadableText(html: string, url: string): string {
    const $ = cheerio.load(html);
    $('script, style, noscript, svg, canvas, iframe').remove();

    const title = $('title').first().text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
    const candidateSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.page-content',
      '.entry-content',
      '.post-content',
      '.container',
      'body',
    ];

    let bodyText = '';
    for (const selector of candidateSelectors) {
      const candidate = $(selector).first();
      if (!candidate.length) continue;

      const pieces: string[] = [];
      candidate.find('h1,h2,h3,h4,h5,h6,p,li,td,th,caption,a').each((_, element) => {
        const text = this.normalizeReadableText($(element).text());
        if (text.length >= 2) pieces.push(text);
      });

      const text = this.normalizeReadableText(pieces.join('\n'));
      if (text.length > bodyText.length) bodyText = text;
      if (bodyText.length >= READABLE_TEXT_MIN_LENGTH) break;
    }

    if (bodyText.length < READABLE_TEXT_MIN_LENGTH) return '';

    return this.normalizeReadableText(
      [`Title: ${title || new URL(url).hostname}`, description, bodyText]
        .filter(Boolean)
        .join('\n\n'),
    );
  }

  private containsHtml(value: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(value);
  }

  private extractReadableJsonText(data: unknown): string {
    const pieces: string[] = [];
    const visit = (value: unknown, key = '') => {
      if (value == null) return;

      if (typeof value === 'string') {
        const normalizedKey = key.toLowerCase();
        const isLikelyContent =
          JSON_CONTENT_KEYS.has(normalizedKey) ||
          normalizedKey.includes('content') ||
          normalizedKey.includes('description') ||
          normalizedKey.includes('body') ||
          normalizedKey.includes('html') ||
          normalizedKey.includes('title');
        if (!isLikelyContent && value.length < READABLE_TEXT_MIN_LENGTH) return;

        const text = this.containsHtml(value)
          ? this.htmlToReadableText(value, 'https://json.local/')
          : this.normalizeReadableText(value);
        if (text.length >= 20) pieces.push(text);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, key));
        return;
      }

      if (typeof value === 'object') {
        for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
          visit(childValue, childKey);
        }
      }
    };

    visit(data);
    const text = this.normalizeReadableText([...new Set(pieces)].join('\n\n'));
    return text.length >= READABLE_TEXT_MIN_LENGTH ? text : '';
  }

  private discoverApiUrlsFromHtml(html: string, baseUrl: string, rootUrl: string): string[] {
    const urls = new Set<string>();
    const candidates = new Set<string>();
    const $ = cheerio.load(html);

    $('[src],[href],[data-url],[data-src]').each((_, element) => {
      for (const attr of ['src', 'href', 'data-url', 'data-src']) {
        const value = $(element).attr(attr);
        if (value) candidates.add(value);
      }
    });

    const stringUrlRegex = /["'`](\/?api\/[^"'`<>\s]+|https?:\/\/[^"'`<>\s]+)["'`]/gi;
    for (const match of html.matchAll(stringUrlRegex)) {
      candidates.add(match[1]);
    }

    for (const candidate of candidates) {
      const normalized = this.normalizeCrawlUrl(candidate, baseUrl);
      if (!normalized || !this.isSameDomain(rootUrl, normalized)) continue;
      if (!CONTENT_API_KEYWORD_REGEX.test(normalized)) continue;
      urls.add(normalized);
    }

    return [...urls];
  }

  private async discoverApiUrlsFromScripts(html: string, baseUrl: string, rootUrl: string): Promise<string[]> {
    const $ = cheerio.load(html);
    const scriptUrls = new Set<string>();
    $('script[src]').each((_, element) => {
      const src = $(element).attr('src');
      if (!src) return;
      try {
        const parsed = new URL(src, baseUrl);
        if (
          (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
          this.isSameDomain(rootUrl, parsed.toString())
        ) {
          scriptUrls.add(parsed.toString());
        }
      } catch {
        return;
      }
    });

    const apiUrls = new Set<string>();
    const endpointRegex = /["'`]([^"'`]*?(?:api|content|page|post|article|cms|about|contact|terms|policy|faq|privacy|refund)[^"'`]*?)["'`]/gi;
    const baseUrlRegex = /baseURL\s*=\s*["'`]([^"'`]+\/api\/?)["'`]/gi;

    for (const scriptUrl of scriptUrls) {
      try {
        const { data } = await axios.get<string>(scriptUrl, {
          headers: { Accept: 'application/javascript,text/javascript,text/plain' },
          timeout: DISCOVERY_TIMEOUT_MS,
        });
        const script = String(data);
        const apiBases = new Set<string>();
        for (const match of script.matchAll(baseUrlRegex)) {
          const normalized = this.normalizeCrawlUrl(match[1], scriptUrl);
          if (normalized && this.isSameDomain(rootUrl, normalized)) apiBases.add(normalized);
        }

        for (const match of script.matchAll(endpointRegex)) {
          const candidate = match[1];
          if (!/[/?=]/.test(candidate) && !CONTENT_API_KEYWORD_REGEX.test(candidate)) {
            continue;
          }

          const normalized = this.normalizeCrawlUrl(candidate, scriptUrl);
          if (
            normalized &&
            this.isSameDomain(rootUrl, normalized) &&
            CONTENT_API_KEYWORD_REGEX.test(normalized)
          ) {
            apiUrls.add(normalized);
          }

          if (!candidate.includes('/') && CONTENT_API_KEYWORD_REGEX.test(candidate)) {
            for (const apiBase of apiBases) {
              const combined = this.normalizeCrawlUrl(candidate, apiBase);
              if (combined && this.isSameDomain(rootUrl, combined)) apiUrls.add(combined);
            }
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to inspect script "${scriptUrl}" for API URLs: ${(err as Error).message}`,
        );
      }
    }

    return [...apiUrls];
  }

  private scoreApiUrlForPage(apiUrl: string, pageUrl: string): number {
    const pageTokens = new URL(pageUrl).pathname
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3);
    const apiLower = apiUrl.toLowerCase();
    return pageTokens.reduce(
      (score, token) => score + (apiLower.includes(token) ? 1 : 0),
      0,
    );
  }

  private async fetchApiReadableContent(apiUrl: string): Promise<string | null> {
    try {
      const { data } = await axios.get<unknown>(apiUrl, {
        headers: { Accept: 'application/json,text/plain,text/html' },
        timeout: DISCOVERY_TIMEOUT_MS,
      });

      const parsed =
        typeof data === 'string'
          ? (() => {
              try {
                return JSON.parse(data);
              } catch {
                return data;
              }
            })()
          : data;
      const text =
        typeof parsed === 'string'
          ? this.htmlToReadableText(parsed, apiUrl) || this.normalizeReadableText(parsed)
          : this.extractReadableJsonText(parsed);

      return text.length >= READABLE_TEXT_MIN_LENGTH ? text : null;
    } catch (err) {
      this.logger.warn(
        `Failed to fetch API readable content from "${apiUrl}": ${(err as Error).message}`,
      );
      return null;
    }
  }

  private isSameDomainXhr(url: string, rootUrl: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        this.isSameDomain(rootUrl, parsed.toString())
      );
    } catch {
      return false;
    }
  }

  private async fetchScrapingAntExtended(
    url: string,
    scrapingAnt: ScrapingAntConfig,
    usage: ScrapingAntUsage,
  ): Promise<ScrapingAntExtendedResponse | null> {
    if (usage.calls >= scrapingAnt.maxPagesPerIngest) {
      this.logger.warn(
        `ScrapingAnt fallback cap reached (${scrapingAnt.maxPagesPerIngest}) before ${url}`,
      );
      return null;
    }

    usage.calls += 1;
    this.logger.log(`Fetching via ScrapingAnt rendered fallback: ${url}`);

    const params = new URLSearchParams();
    params.set('url', url);
    params.set('x-api-key', scrapingAnt.apiKey);
    params.set('browser', 'true');
    params.set('timeout', String(scrapingAnt.timeoutSeconds));
    for (const resource of SCRAPINGANT_BLOCKED_RESOURCES) {
      params.append('block_resource', resource);
    }

    try {
      const response = await axios.get<ScrapingAntExtendedResponse>(
        SCRAPINGANT_EXTENDED_ENDPOINT,
        { params, timeout: (scrapingAnt.timeoutSeconds + 5) * 1000 },
      );

      const rawCredits =
        response.headers?.['ant-credits-cost'] ?? response.headers?.['Ant-Credits-Cost'];
      const credits = Number(rawCredits);
      if (Number.isFinite(credits)) usage.credits += credits;

      return response.data;
    } catch (err) {
      throw new Error(`ScrapingAnt fallback failed for ${url}: ${(err as Error).message}`);
    }
  }

  private extractScrapingAntReadableContent(
    response: ScrapingAntExtendedResponse,
    pageUrl: string,
    rootUrl: string,
  ): string | null {
    if (typeof response.text === 'string') {
      const text = this.normalizeReadableText(response.text);
      if (text.length >= READABLE_TEXT_MIN_LENGTH) return text;
    }

    if (typeof response.html === 'string') {
      const htmlText = this.htmlToReadableText(response.html, pageUrl);
      if (htmlText) return htmlText;
    }

    const xhrPieces: string[] = [];
    if (Array.isArray(response.xhrs)) {
      for (const xhr of response.xhrs) {
        const item = xhr as { url?: unknown; body?: unknown; status?: unknown };
        if (typeof item.url !== 'string' || !this.isSameDomainXhr(item.url, rootUrl)) {
          continue;
        }
        if (
          typeof item.status === 'number' &&
          (item.status < 200 || item.status >= 300)
        ) {
          continue;
        }

        const body = item.body;
        if (body == null) continue;

        let text = '';
        if (typeof body === 'string') {
          let parsed: unknown = body;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          text =
            typeof parsed === 'string'
              ? this.htmlToReadableText(parsed, item.url) || this.normalizeReadableText(parsed)
              : this.extractReadableJsonText(parsed);
        } else {
          text = this.extractReadableJsonText(body);
        }

        if (text.length >= READABLE_TEXT_MIN_LENGTH) xhrPieces.push(text);
      }
    }

    const xhrText = this.normalizeReadableText([...new Set(xhrPieces)].join('\n\n'));
    if (xhrText.length >= READABLE_TEXT_MIN_LENGTH) return xhrText;

    const iframePieces: string[] = [];
    if (Array.isArray(response.iframes)) {
      for (const iframe of response.iframes) {
        const item = iframe as { src?: unknown; html?: unknown };
        if (
          typeof item.src === 'string' &&
          !this.isSameDomainXhr(item.src, rootUrl)
        ) {
          continue;
        }
        if (typeof item.html !== 'string') continue;

        const text = this.htmlToReadableText(
          item.html,
          typeof item.src === 'string' ? item.src : pageUrl,
        );
        if (text) iframePieces.push(text);
      }
    }

    const iframeText = this.normalizeReadableText([...new Set(iframePieces)].join('\n\n'));
    return iframeText.length >= READABLE_TEXT_MIN_LENGTH ? iframeText : null;
  }

  private extractScrapingAntDiscoveredLinks(
    response: ScrapingAntExtendedResponse | undefined,
    pageUrl: string,
    rootUrl: string,
  ): string[] {
    if (!response) return [];

    const links = new Set<string>();
    if (typeof response.html === 'string') {
      this.extractHtmlLinks(response.html, pageUrl, rootUrl).forEach((link) =>
        links.add(link),
      );
    }

    if (Array.isArray(response.xhrs)) {
      for (const xhr of response.xhrs) {
        const item = xhr as { url?: unknown; status?: unknown };
        if (typeof item.url !== 'string') continue;
        if (
          typeof item.status === 'number' &&
          (item.status < 200 || item.status >= 300)
        ) {
          continue;
        }
        if (!CONTENT_API_KEYWORD_REGEX.test(item.url)) continue;
        this.addNormalizedLink(links, item.url, pageUrl, rootUrl);
      }
    }

    return [...links];
  }

  private async fetchReadableContent(
    url: string,
    rootUrl: string,
    scrapingAnt: ScrapingAntConfig | null,
    scrapingAntUsage: ScrapingAntUsage,
  ): Promise<ReadablePageContent> {
    const fetched = await this.fetchMarkdown(url);
    if (this.isMeaningfulMarkdown(fetched.markdown)) return fetched;

    this.logger.warn(`Jina returned metadata-only content for ${url}`);

    const rawHtml = await this.fetchRawHtml(url);
    if (rawHtml) {
      const htmlText = this.htmlToReadableText(rawHtml, url);
      if (htmlText) {
        this.logger.log(`Using raw HTML fallback for ${url}`);
        return {
          title: fetched.title,
          markdown: `Title: ${fetched.title}\nURL Source: ${url}\n\n${htmlText}`,
        };
      }

      const apiUrls = [
        ...this.discoverApiUrlsFromHtml(rawHtml, url, rootUrl),
        ...(await this.discoverApiUrlsFromScripts(rawHtml, url, rootUrl)),
      ].sort(
        (a, b) => this.scoreApiUrlForPage(b, url) - this.scoreApiUrlForPage(a, url),
      );
      for (const apiUrl of [...new Set(apiUrls)]) {
        const apiText = await this.fetchApiReadableContent(apiUrl);
        if (apiText) {
          this.logger.log(`Using API content fallback for ${url} via ${apiUrl}`);
          return {
            title: fetched.title,
            markdown: `Title: ${fetched.title}\nURL Source: ${url}\nAPI Source: ${apiUrl}\n\n${apiText}`,
          };
        }
      }
    }

    if (scrapingAnt?.enabled) {
      const scrapingAntResponse = await this.fetchScrapingAntExtended(
        url,
        scrapingAnt,
        scrapingAntUsage,
      );
      if (scrapingAntResponse) {
        const scrapingAntText = this.extractScrapingAntReadableContent(
          scrapingAntResponse,
          url,
          rootUrl,
        );
        if (scrapingAntText) {
          this.logger.log(`Using ScrapingAnt rendered fallback for ${url}`);
          return {
            title: fetched.title,
            markdown: `Title: ${fetched.title}\nURL Source: ${url}\nScrapingAnt Source: rendered\n\n${scrapingAntText}`,
            scrapingAnt: scrapingAntResponse,
          };
        }
      }
    }

    throw new Error(`No readable content found for ${url}`);
  }

  private async discoverLinks(
    currentUrl: string,
    rootUrl: string,
    markdown: string,
    scrapingAnt?: ScrapingAntExtendedResponse,
  ): Promise<string[]> {
    const markdownLinks = this.extractMarkdownLinks(markdown, currentUrl, rootUrl);
    let htmlLinks: string[] = [];

    try {
      const { data } = await axios.get<string>(currentUrl, {
        headers: { Accept: 'text/html' },
        timeout: DISCOVERY_TIMEOUT_MS,
      });
      htmlLinks = this.extractHtmlLinks(String(data), currentUrl, rootUrl);
    } catch (err) {
      this.logger.warn(
        `Failed to fetch raw HTML links for "${currentUrl}": ${(err as Error).message}`,
      );
    }

    const scrapingAntLinks = this.extractScrapingAntDiscoveredLinks(
      scrapingAnt,
      currentUrl,
      rootUrl,
    );

    this.logger.log(
      `Discovered ${markdownLinks.length} markdown links, ${htmlLinks.length} html links, ${scrapingAntLinks.length} rendered links for ${currentUrl}`,
    );

    return [...new Set([...markdownLinks, ...htmlLinks, ...scrapingAntLinks])];
  }

  private parseSitemapLocations(xml: string): string[] {
    const locations = new Set<string>();
    const locRegex = /<loc>\s*([^<]+?)\s*<\/loc>/gi;

    for (const match of xml.matchAll(locRegex)) {
      locations.add(this.decodeHtmlEntityUrl(match[1].trim()));
    }

    return [...locations];
  }

  private async fetchSitemapUrls(
    sitemapUrl: string,
    rootUrl: string,
    depth = 0,
  ): Promise<string[]> {
    if (depth > 2) return [];

    try {
      const { data } = await axios.get<string>(sitemapUrl, {
        headers: { Accept: 'application/xml,text/xml,text/plain' },
        timeout: DISCOVERY_TIMEOUT_MS,
      });

      const urls = new Set<string>();
      for (const loc of this.parseSitemapLocations(String(data))) {
        let parsed: URL;
        try {
          parsed = new URL(loc, sitemapUrl);
        } catch {
          continue;
        }

        if (!this.isSameDomain(rootUrl, parsed.toString())) continue;

        if (this.isStaticAssetPath(parsed.pathname)) {
          if (parsed.pathname.toLowerCase().endsWith('.xml')) {
            const nestedUrls = await this.fetchSitemapUrls(parsed.toString(), rootUrl, depth + 1);
            nestedUrls.forEach((url) => urls.add(url));
          }
          continue;
        }

        const normalized = this.normalizeCrawlUrl(parsed.toString());
        if (normalized) urls.add(normalized);
      }

      return [...urls];
    } catch (err) {
      this.logger.warn(
        `Failed to discover sitemap URLs from "${sitemapUrl}": ${(err as Error).message}`,
      );
      return [];
    }
  }

  private async discoverSitemapUrls(rootUrl: string): Promise<string[]> {
    const sitemapUrls = new Set<string>();
    const root = new URL(rootUrl);

    try {
      const robotsUrl = new URL('/robots.txt', root).toString();
      const { data } = await axios.get<string>(robotsUrl, {
        headers: { Accept: 'text/plain' },
        timeout: DISCOVERY_TIMEOUT_MS,
      });

      for (const line of String(data).split(/\r?\n/)) {
        const match = line.match(/^\s*Sitemap:\s*(\S+)\s*$/i);
        if (match) sitemapUrls.add(this.decodeHtmlEntityUrl(match[1]));
      }
    } catch (err) {
      this.logger.warn(
        `Failed to discover robots.txt sitemaps for "${rootUrl}": ${(err as Error).message}`,
      );
    }

    for (const path of COMMON_SITEMAP_PATHS) {
      sitemapUrls.add(new URL(path, root).toString());
    }

    const discovered = new Set<string>();
    for (const sitemapUrl of sitemapUrls) {
      const urls = await this.fetchSitemapUrls(sitemapUrl, rootUrl);
      urls.forEach((url) => discovered.add(url));
    }

    return [...discovered];
  }

  private async discoverWordPressUrls(rootUrl: string): Promise<string[]> {
    const root = new URL(rootUrl);
    const endpoints = [
      new URL('/wp-json/wp/v2/pages?per_page=100', root).toString(),
      new URL('/wp-json/wp/v2/posts?per_page=100', root).toString(),
    ];
    const discovered = new Set<string>();

    for (const endpoint of endpoints) {
      try {
        const { data } = await axios.get<unknown>(endpoint, {
          headers: { Accept: 'application/json' },
          timeout: DISCOVERY_TIMEOUT_MS,
        });
        const items = typeof data === 'string' ? JSON.parse(data) : data;
        if (!Array.isArray(items)) continue;

        for (const item of items) {
          const link = (item as { link?: unknown }).link;
          if (typeof link !== 'string') continue;

          const normalized = this.normalizeCrawlUrl(link);
          if (normalized && this.isSameDomain(rootUrl, normalized)) {
            discovered.add(normalized);
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to discover WordPress URLs from "${endpoint}": ${(err as Error).message}`,
        );
      }
    }

    return [...discovered];
  }

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

  private async persistMarkdownChunks(
    page: WebPage,
    userId: string,
    sourceUrl: string,
    markdown: string,
    splitter: RecursiveCharacterTextSplitter,
    startChunkIndex: number,
  ): Promise<number> {
    const docs = await splitter.createDocuments([markdown]);
    this.logger.log(`Split "${sourceUrl}" into ${docs.length} chunks`);

    for (let i = 0; i < docs.length; i += EMBED_BATCH_SIZE) {
      const batch = docs.slice(i, i + EMBED_BATCH_SIZE);
      const vectors = await this.embeddings.embedDocuments(
        batch.map((d) => d.pageContent),
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

  /**
   * Core ingest logic: crawl same-domain pages, fetch, split, embed, persist.
   * Returns the saved WebPage record representing the submitted root URL.
   */
  private async ingestIntoRecord(
    page: WebPage,
    userId: string,
    onProgress?: (event: WebPageIngestProgress) => void,
  ): Promise<WebPage> {
    const rootUrl = this.requireCrawlUrl(page.url);
    const crawlMaxPages = this.getCrawlMaxPages();
    const queue: string[] = [rootUrl];
    const queued = new Set<string>(queue);
    const visited = new Set<string>();
    const scrapingAnt = this.getScrapingAntConfig();
    const scrapingAntUsage: ScrapingAntUsage = { calls: 0, credits: 0 };
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.get<number>('rag.chunkSize') ?? 1000,
      chunkOverlap: this.config.get<number>('rag.chunkOverlap') ?? 200,
    });

    let rootTitle = '';
    let chunksCreated = 0;
    let pagesFetched = 0;
    let pagesFailed = 0;

    this.logger.log(
      `Crawling ${rootUrl} for user ${userId} with max ${crawlMaxPages} pages`,
    );

    const enqueuePrioritized = (urls: string[]) => {
      for (const url of this.sortCrawlCandidates(urls, rootUrl)) {
        if (queued.size >= crawlMaxPages) break;
        if (queued.has(url) || visited.has(url)) continue;

        queue.push(url);
        queued.add(url);
      }
      queue.splice(0, queue.length, ...this.sortCrawlCandidates(queue, rootUrl));
    };

    const sitemapUrls = await this.discoverSitemapUrls(rootUrl);
    this.logger.log(`Seeded ${sitemapUrls.length} sitemap URLs for ${rootUrl}`);

    const wordPressUrls = await this.discoverWordPressUrls(rootUrl);
    this.logger.log(`Seeded ${wordPressUrls.length} WordPress URLs for ${rootUrl}`);
    enqueuePrioritized([...sitemapUrls, ...wordPressUrls]);

    while (queue.length > 0 && visited.size < crawlMaxPages) {
      const currentUrl = queue.shift();
      if (!currentUrl || visited.has(currentUrl)) continue;

      visited.add(currentUrl);
      onProgress?.({ type: 'scanning', rootUrl, url: currentUrl });

      let fetched: ReadablePageContent;
      try {
        fetched = await this.fetchReadableContent(
          currentUrl,
          rootUrl,
          scrapingAnt,
          scrapingAntUsage,
        );
      } catch (err) {
        if (currentUrl === rootUrl) throw err;

        pagesFailed += 1;
        this.logger.warn(
          `Failed to extract linked page "${currentUrl}": ${(err as Error).message}`,
        );
        continue;
      }

      pagesFetched += 1;
      if (currentUrl === rootUrl) rootTitle = fetched.title;

      chunksCreated += await this.persistMarkdownChunks(
        page,
        userId,
        currentUrl,
        fetched.markdown,
        splitter,
        chunksCreated,
      );

      const discoveredLinks = await this.discoverLinks(
        currentUrl,
        rootUrl,
        fetched.markdown,
        fetched.scrapingAnt,
      );
      enqueuePrioritized(discoveredLinks);
    }

    page.url = rootUrl;
    page.title = rootTitle || new URL(rootUrl).hostname;
    page.chunksCreated = chunksCreated;
    page.pagesFetched = pagesFetched;
    page.pagesFailed = pagesFailed;

    this.logger.log(
      `Crawled ${pagesFetched} page(s), failed ${pagesFailed}, created ${chunksCreated} chunks for ${rootUrl}`,
    );
    if (scrapingAntUsage.calls > 0) {
      this.logger.log(
        `ScrapingAnt fallback used ${scrapingAntUsage.calls} request(s), ${scrapingAntUsage.credits} credit(s) for ${rootUrl}`,
      );
    }

    return this.webPageRepo.save(page);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async ingestUrl(
    url: string,
    userId: string,
    onProgress?: (event: WebPageIngestProgress) => void,
  ): Promise<IngestedSiteSummary> {
    const rootUrl = this.requireCrawlUrl(url);
    this.logger.log(`Ingesting URL: ${rootUrl} for user ${userId}`);

    const page = this.webPageRepo.create({ url: rootUrl, userId });
    await this.webPageRepo.save(page);

    let saved: WebPage;
    try {
      saved = await this.ingestIntoRecord(page, userId, onProgress);
    } catch (err) {
      await this.webPageRepo.remove(page);
      throw err;
    }

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
      pagesFetched: saved.pagesFetched,
      pagesFailed: saved.pagesFailed,
    };
  }

  async refetchUrl(id: string, userId: string): Promise<IngestedSiteSummary> {
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
    await this.webPageRepo.remove(page);
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );
  }
}
