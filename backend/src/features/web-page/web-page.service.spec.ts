import axios from 'axios';
import { WebPageService } from './web-page.service';
import { WebPage } from './web-page.entity';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const readableText =
  'This page has enough readable content for the crawler to treat it as meaningful body text.';

describe('WebPageService', () => {
  const createService = (
    crawlMaxPages?: number,
    scrapingAnt: {
      apiKey?: string;
      enabled?: boolean;
      timeoutSeconds?: number;
      maxPagesPerIngest?: number;
    } = {},
  ) => {
    const savedChunks: unknown[] = [];
    const pages = new Map<string, WebPage>();
    const embeddings = {
      embedDocuments: jest.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2])),
    };

    const webPageRepo = {
      create: jest.fn((data: Partial<WebPage>) => ({ id: 'page-id', ...data }) as WebPage),
      save: jest.fn(async (page: WebPage) => {
        pages.set(page.id, page);
        return page;
      }),
      remove: jest.fn(async (page: WebPage) => {
        pages.delete(page.id);
        return page;
      }),
      findOne: jest.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const page = pages.get(where.id);
        return page && page.userId === where.userId ? page : null;
      }),
    };

    const chunkRepo = {
      create: jest.fn((data: unknown) => data),
      save: jest.fn(async (chunks: unknown[]) => {
        savedChunks.push(...chunks);
        return chunks;
      }),
      delete: jest.fn(async () => ({ affected: savedChunks.length })),
    };

    const service = new WebPageService(
      webPageRepo as never,
      chunkRepo as never,
      {
        get: jest.fn((key: string) => {
          if (key === 'web.crawlMaxPages') return crawlMaxPages;
          if (key === 'web.scrapingAnt.apiKey') return scrapingAnt.apiKey;
          if (key === 'web.scrapingAnt.enabled') return scrapingAnt.enabled;
          if (key === 'web.scrapingAnt.timeoutSeconds') return scrapingAnt.timeoutSeconds;
          if (key === 'web.scrapingAnt.maxPagesPerIngest') return scrapingAnt.maxPagesPerIngest;
          if (key === 'rag.chunkSize') return 1000;
          if (key === 'rag.chunkOverlap') return 200;
          return undefined;
        }),
      } as never,
      { query: jest.fn() } as never,
      { getEmbeddings: jest.fn(() => embeddings) } as never,
    );

    return { service, webPageRepo, chunkRepo, savedChunks, pages };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes crawl URLs and filters non-crawlable URLs', () => {
    const { service } = createService();
    const target = service as unknown as {
      normalizeCrawlUrl(url: string, baseUrl?: string): string | null;
    };

    expect(target.normalizeCrawlUrl('/docs?a=1#section', 'https://example.com/start')).toBe(
      'https://example.com/docs?a=1',
    );
    expect(target.normalizeCrawlUrl('mailto:hello@example.com', 'https://example.com')).toBeNull();
    expect(target.normalizeCrawlUrl('/assets/logo.png', 'https://example.com')).toBeNull();
  });

  it('matches same-domain subdomains but keeps localhost and IPs exact', () => {
    const { service } = createService();
    const target = service as unknown as {
      isSameDomain(rootUrl: string, candidateUrl: string): boolean;
    };

    expect(target.isSameDomain('https://www.example.com', 'https://docs.example.com/start')).toBe(true);
    expect(target.isSameDomain('https://www.example.com', 'https://other.com/start')).toBe(false);
    expect(target.isSameDomain('http://localhost:3000', 'http://localhost:5173/docs')).toBe(true);
    expect(target.isSameDomain('http://127.0.0.1:3000', 'http://127.0.0.2:3000/docs')).toBe(false);
  });

  it('clamps crawl and ScrapingAnt caps to hard maximums', () => {
    const defaultService = createService().service as unknown as {
      getCrawlMaxPages(): number;
    };
    const configuredService = createService(100, {
      apiKey: 'scraping-ant-key',
      maxPagesPerIngest: 25,
    }).service as unknown as {
      getCrawlMaxPages(): number;
      getScrapingAntConfig(): { maxPagesPerIngest: number } | null;
    };

    expect(defaultService.getCrawlMaxPages()).toBe(30);
    expect(configuredService.getCrawlMaxPages()).toBe(30);
    expect(configuredService.getScrapingAntConfig()?.maxPagesPerIngest).toBe(10);
  });

  it('sorts crawl candidates by high-value page priority', () => {
    const { service } = createService();
    const target = service as unknown as {
      sortCrawlCandidates(urls: string[], rootUrl: string): string[];
    };

    expect(
      target.sortCrawlCandidates(
        [
          'https://example.com/blog/page/2',
          'https://example.com/privacy-policy',
          'https://example.com/about',
          'https://example.com/category/news',
          'https://example.com/terms-condition',
          'https://example.com/services',
        ],
        'https://example.com/',
      ),
    ).toEqual([
      'https://example.com/privacy-policy',
      'https://example.com/terms-condition',
      'https://example.com/about',
      'https://example.com/services',
      'https://example.com/blog/page/2',
      'https://example.com/category/news',
    ]);
  });

  it('extracts raw HTML menu links in common href formats', () => {
    const { service } = createService();
    const target = service as unknown as {
      extractHtmlLinks(html: string, baseUrl: string, rootUrl: string): string[];
    };

    const links = target.extractHtmlLinks(
      [
        '<a href="/about#team">About</a>',
        "<a href='/contact'>Contact</a>",
        '<a href=https://blog.example.com/offers>Offers</a>',
        '<a href="/assets/logo.png">Logo</a>',
        '<a href="https://external.com/page">External</a>',
      ].join('\n'),
      'https://example.com/',
      'https://example.com/',
    );

    expect(new Set(links)).toEqual(
      new Set([
        'https://example.com/about',
        'https://example.com/contact',
        'https://blog.example.com/offers',
      ]),
    );
  });

  it('parses sitemap locations from XML', () => {
    const { service } = createService();
    const target = service as unknown as {
      parseSitemapLocations(xml: string): string[];
    };

    expect(
      target.parseSitemapLocations(
        '<urlset><url><loc>https://example.com/about?x=1&amp;y=2</loc></url></urlset>',
      ),
    ).toEqual(['https://example.com/about?x=1&y=2']);
  });

  it('detects metadata-only Jina markdown', () => {
    const { service } = createService();
    const target = service as unknown as {
      isMeaningfulMarkdown(markdown: string): boolean;
      stripJinaMetadata(markdown: string): string;
    };

    expect(target.isMeaningfulMarkdown('Title:\n\nURL Source: https://example.com/about')).toBe(false);
    expect(target.isMeaningfulMarkdown(`Title: Page\nURL Source: https://example.com\n\n${readableText}`)).toBe(true);
    expect(target.stripJinaMetadata(`Title: Page\nURL Source: https://example.com\n\n${readableText}`)).toBe(readableText);
  });

  it('extracts readable text from SSR/static HTML with Cheerio', () => {
    const { service } = createService();
    const target = service as unknown as {
      htmlToReadableText(html: string, url: string): string;
    };

    const text = target.htmlToReadableText(
      `<html>
        <head><title>About</title><meta name="description" content="About description"></head>
        <body>
          <script>window.secret = "ignore me"</script>
          <style>.hidden{display:none}</style>
          <main><h1>About us</h1><p>${readableText}</p><ul><li>Helpful support</li></ul></main>
        </body>
      </html>`,
      'https://example.com/about',
    );

    expect(text).toContain('About us');
    expect(text).toContain(readableText);
    expect(text).toContain('Helpful support');
    expect(text).not.toContain('ignore me');
  });

  it('ignores HTML shells without meaningful body text', () => {
    const { service } = createService();
    const target = service as unknown as {
      htmlToReadableText(html: string, url: string): string;
    };

    expect(
      target.htmlToReadableText(
        '<html><head><title>SPA</title><meta name="description" content="A nice website"></head><body><app-root></app-root><script src="/main.js"></script></body></html>',
        'https://example.com/about',
      ),
    ).toBe('');
  });

  it('extracts readable text from nested JSON and HTML payloads', () => {
    const { service } = createService();
    const target = service as unknown as {
      extractReadableJsonText(data: unknown): string;
    };

    const text = target.extractReadableJsonText({
      Success: true,
      Payload: `<section><h1>About API</h1><p>${readableText}</p></section>`,
      meta: { tiny: 'ok' },
    });

    expect(text).toContain('About API');
    expect(text).toContain(readableText);
    expect(text).not.toContain('ok');
  });

  it('disables ScrapingAnt config when the API key is missing', () => {
    const { service } = createService();
    const target = service as unknown as {
      getScrapingAntConfig(): unknown;
    };

    expect(target.getScrapingAntConfig()).toBeNull();
  });

  it('requests ScrapingAnt extended rendering with credit-conscious parameters', async () => {
    const { service } = createService(100, {
      apiKey: 'scraping-ant-key',
      enabled: true,
      timeoutSeconds: 20,
      maxPagesPerIngest: 25,
    });
    const target = service as unknown as {
      getScrapingAntConfig(): {
        apiKey: string;
        enabled: boolean;
        timeoutSeconds: number;
        maxPagesPerIngest: number;
      };
      fetchScrapingAntExtended(
        url: string,
        config: unknown,
        usage: { calls: number; credits: number },
      ): Promise<unknown>;
    };
    mockedAxios.get.mockResolvedValue({
      data: { text: readableText },
      headers: { 'ant-credits-cost': '10' },
    });

    const usage = { calls: 0, credits: 0 };
    await target.fetchScrapingAntExtended(
      'https://example.com/spa',
      target.getScrapingAntConfig(),
      usage,
    );

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.scrapingant.com/v2/extended',
      expect.objectContaining({
        timeout: 25_000,
      }),
    );
    const params = mockedAxios.get.mock.calls[0][1]?.params as URLSearchParams;
    expect(params.get('url')).toBe('https://example.com/spa');
    expect(params.get('x-api-key')).toBe('scraping-ant-key');
    expect(params.get('browser')).toBe('true');
    expect(params.get('timeout')).toBe('20');
    expect(params.getAll('block_resource')).toEqual([
      'image',
      'media',
      'font',
      'stylesheet',
    ]);
    expect(usage).toEqual({ calls: 1, credits: 10 });
  });

  it('extracts ScrapingAnt readable text from text, HTML, XHRs, and iframes', () => {
    const { service } = createService();
    const target = service as unknown as {
      extractScrapingAntReadableContent(
        response: unknown,
        pageUrl: string,
        rootUrl: string,
      ): string | null;
    };

    expect(
      target.extractScrapingAntReadableContent(
        { text: readableText },
        'https://example.com/spa',
        'https://example.com/',
      ),
    ).toBe(readableText);
    expect(
      target.extractScrapingAntReadableContent(
        { html: `<main><h1>Rendered HTML</h1><p>${readableText}</p></main>` },
        'https://example.com/spa',
        'https://example.com/',
      ),
    ).toContain('Rendered HTML');
    expect(
      target.extractScrapingAntReadableContent(
        {
          xhrs: [
            { url: 'https://analytics.example.net/ping', status: 200, body: 'ignore' },
            {
              url: 'https://example.com/api/page',
              status: 200,
              body: JSON.stringify({ payload: `<article><h1>XHR Content</h1><p>${readableText}</p></article>` }),
            },
          ],
        },
        'https://example.com/spa',
        'https://example.com/',
      ),
    ).toContain('XHR Content');
    expect(
      target.extractScrapingAntReadableContent(
        {
          iframes: [
            {
              src: 'https://example.com/frame',
              html: `<article><h1>Iframe Content</h1><p>${readableText}</p></article>`,
            },
          ],
        },
        'https://example.com/spa',
        'https://example.com/',
      ),
    ).toContain('Iframe Content');
  });

  it('extracts rendered ScrapingAnt links and content-like XHR URLs', () => {
    const { service } = createService();
    const target = service as unknown as {
      extractScrapingAntDiscoveredLinks(
        response: unknown,
        pageUrl: string,
        rootUrl: string,
      ): string[];
    };

    const links = target.extractScrapingAntDiscoveredLinks(
      {
        html: '<a href="/rendered-about#team">About</a><a href="https://other.com/page">External</a>',
        xhrs: [
          { url: 'https://example.com/api/page-content', status: 200 },
          { url: 'https://example.com/analytics.gif', status: 200 },
          { url: 'https://other.com/api/page-content', status: 200 },
        ],
      },
      'https://example.com/spa',
      'https://example.com/',
    );

    expect(new Set(links)).toEqual(
      new Set([
        'https://example.com/rendered-about',
        'https://example.com/api/page-content',
      ]),
    );
  });

  it('discovers sitemap URLs from robots.txt and sitemap XML', async () => {
    const { service } = createService();
    const target = service as unknown as {
      discoverSitemapUrls(rootUrl: string): Promise<string[]>;
    };

    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://example.com/robots.txt') {
        return { data: 'Sitemap: https://example.com/sitemap-index.xml' };
      }
      if (url === 'https://example.com/sitemap-index.xml') {
        return { data: '<sitemapindex><sitemap><loc>https://example.com/pages.xml</loc></sitemap></sitemapindex>' };
      }
      if (url === 'https://example.com/pages.xml') {
        return { data: '<urlset><url><loc>https://example.com/about</loc></url></urlset>' };
      }
      if (url === 'https://example.com/sitemap.xml') {
        return { data: '<urlset><url><loc>https://example.com/contact</loc></url></urlset>' };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await expect(target.discoverSitemapUrls('https://example.com/')).resolves.toEqual(
      expect.arrayContaining(['https://example.com/about', 'https://example.com/contact']),
    );
  });

  it('crawls linked same-domain pages under one web page record', async () => {
    const { service, savedChunks } = createService();
    const pages: Record<string, string> = {
      'https://example.com/':
        `Title: Root\n\n${readableText}\n[About](/about)\n[About again](/about#team)\n[Docs](https://docs.example.com/start)\n[Image](/logo.png)\n[External](https://other.com/page)`,
      'https://example.com/about': `Title: About\n\n${readableText}\n[Root](/)`,
      'https://docs.example.com/start': `Title: Docs\n\n${readableText}`,
    };

    mockedAxios.get.mockImplementation(async (jinaUrl: string) => {
      const requestedUrl = jinaUrl.replace('https://r.jina.ai/', '');
      const data = pages[requestedUrl];
      if (!data) throw new Error(`Unexpected fetch: ${requestedUrl}`);
      return { data };
    });

    const result = await service.ingestUrl('https://example.com/#top', 'user-id');

    expect(result).toMatchObject({
      webPageId: 'page-id',
      url: 'https://example.com/',
      title: 'Root',
      pagesFetched: 3,
      pagesFailed: 0,
      chunksCreated: 3,
    });
    expect(savedChunks).toHaveLength(3);
    expect(new Set(savedChunks.map((chunk) => (chunk as { webPageId: string }).webPageId))).toEqual(
      new Set(['page-id']),
    );
    expect(new Set(savedChunks.map((chunk) => (chunk as { url: string }).url))).toEqual(
      new Set(['https://example.com/', 'https://example.com/about', 'https://docs.example.com/start']),
    );
  });

  it('continues when discovered pages fail and caps queued pages', async () => {
    const { service } = createService(3);
    mockedAxios.get.mockImplementation(async (jinaUrl: string) => {
      const requestedUrl = jinaUrl.replace('https://r.jina.ai/', '');
      if (requestedUrl === 'https://example.com/') {
        return { data: `Title: Root\n\n${readableText}\n[One](/one)\n[Broken](/broken)\n[Skipped](/skipped)` };
      }
      if (requestedUrl === 'https://example.com/one') {
        return { data: `Title: One\n\n${readableText}` };
      }
      if (requestedUrl === 'https://example.com/broken') {
        throw new Error('boom');
      }
      throw new Error(`Unexpected fetch: ${requestedUrl}`);
    });

    const result = await service.ingestUrl('https://example.com/', 'user-id');

    expect(result.pagesFetched).toBe(2);
    expect(result.pagesFailed).toBe(1);
    expect(
      mockedAxios.get.mock.calls.filter(([url]) =>
        String(url).startsWith('https://r.jina.ai/'),
      ),
    ).toHaveLength(3);
  });

  it('crawls raw HTML menu links when Jina markdown has no links', async () => {
    const { service, savedChunks } = createService();
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://r.jina.ai/https://example.com/') {
        return { data: `Title: Root\n\n${readableText}` };
      }
      if (url === 'https://example.com/') {
        return { data: '<nav><a href="/about">About</a><a href="/contact">Contact</a></nav>' };
      }
      if (url === 'https://r.jina.ai/https://example.com/about') {
        return { data: `Title: About\n\n${readableText}` };
      }
      if (url === 'https://r.jina.ai/https://example.com/contact') {
        return { data: `Title: Contact\n\n${readableText}` };
      }
      if (url === 'https://example.com/about' || url === 'https://example.com/contact') {
        return { data: '<main>No extra links</main>' };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await service.ingestUrl('https://example.com/', 'user-id');

    expect(result.pagesFetched).toBe(3);
    expect(savedChunks).toHaveLength(3);
    expect(new Set(savedChunks.map((chunk) => (chunk as { url: string }).url))).toEqual(
      new Set(['https://example.com/', 'https://example.com/about', 'https://example.com/contact']),
    );
  });

  it('prioritizes sitemap seed URLs before low-value pages', async () => {
    const { service, savedChunks } = createService(5);
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://example.com/robots.txt') {
        return { data: 'Sitemap: https://example.com/sitemap.xml' };
      }
      if (url === 'https://example.com/sitemap.xml') {
        return {
          data: [
            '<urlset>',
            '<url><loc>https://example.com/blog/page/2</loc></url>',
            '<url><loc>https://example.com/about</loc></url>',
            '<url><loc>https://example.com/privacy-policy</loc></url>',
            '<url><loc>https://example.com/terms-condition</loc></url>',
            '<url><loc>https://example.com/category/news</loc></url>',
            '<url><loc>https://example.com/services</loc></url>',
            '</urlset>',
          ].join(''),
        };
      }
      if (
        url === 'https://example.com/sitemap_index.xml' ||
        url === 'https://example.com/wp-sitemap.xml' ||
        url.startsWith('https://example.com/wp-json/')
      ) {
        throw new Error(`Unexpected fetch: ${url}`);
      }
      if (String(url).startsWith('https://r.jina.ai/')) {
        const requestedUrl = String(url).replace('https://r.jina.ai/', '');
        return { data: `Title: ${requestedUrl}\n\n${readableText}` };
      }
      if (String(url).startsWith('https://example.com/')) {
        return { data: '<main>No extra links</main>' };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await service.ingestUrl('https://example.com/', 'user-id');

    expect(result.pagesFetched).toBe(5);
    expect(savedChunks.map((chunk) => (chunk as { url: string }).url)).toEqual([
      'https://example.com/',
      'https://example.com/privacy-policy',
      'https://example.com/terms-condition',
      'https://example.com/about',
      'https://example.com/services',
    ]);
  });

  it('moves newly discovered high-priority raw HTML links ahead of lower queued links', async () => {
    const { service, savedChunks } = createService(3);
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://example.com/robots.txt') {
        return { data: 'Sitemap: https://example.com/sitemap.xml' };
      }
      if (url === 'https://example.com/sitemap.xml') {
        return { data: '<urlset><url><loc>https://example.com/blog/page/2</loc></url></urlset>' };
      }
      if (
        url === 'https://example.com/sitemap_index.xml' ||
        url === 'https://example.com/wp-sitemap.xml' ||
        url.startsWith('https://example.com/wp-json/')
      ) {
        throw new Error(`Unexpected fetch: ${url}`);
      }
      if (url === 'https://r.jina.ai/https://example.com/') {
        return { data: `Title: Root\n\n${readableText}` };
      }
      if (url === 'https://example.com/') {
        return { data: '<a href="/privacy-policy">Privacy</a>' };
      }
      if (
        url === 'https://r.jina.ai/https://example.com/privacy-policy' ||
        url === 'https://r.jina.ai/https://example.com/blog/page/2'
      ) {
        return { data: `Title: Page\n\n${readableText}` };
      }
      if (url === 'https://example.com/privacy-policy' || url === 'https://example.com/blog/page/2') {
        return { data: '<main>No extra links</main>' };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await service.ingestUrl('https://example.com/', 'user-id');

    expect(savedChunks.map((chunk) => (chunk as { url: string }).url)).toEqual([
      'https://example.com/',
      'https://example.com/privacy-policy',
      'https://example.com/blog/page/2',
    ]);
  });

  it('stores raw HTML fallback text when Jina is metadata-only', async () => {
    const { service, savedChunks } = createService();
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://r.jina.ai/https://example.com/about') {
        return { data: 'Title: About\n\nURL Source: https://example.com/about' };
      }
      if (url === 'https://example.com/about') {
        return { data: `<main><h1>About from HTML</h1><p>${readableText}</p></main>` };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await service.ingestUrl('https://example.com/about', 'user-id');

    expect(result.pagesFetched).toBe(1);
    expect((savedChunks[0] as { content: string }).content).toContain('About from HTML');
  });

  it('stores API fallback text for API-backed SPA pages', async () => {
    const { service, savedChunks } = createService();
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://r.jina.ai/https://example.com/content/about') {
        return { data: 'Title: About\n\nURL Source: https://example.com/content/about' };
      }
      if (url === 'https://example.com/content/about') {
        return { data: '<html><body><app-root></app-root><script src="/main.js"></script></body></html>' };
      }
      if (url === 'https://example.com/main.js') {
        return {
          data: 'this.baseURL="https://example.com/api/";this.aboutUsContent=this.baseURL+"GetAboutUsPage";',
        };
      }
      if (url === 'https://example.com/api/GetAboutUsPage') {
        return { data: { Payload: `<div><h1>API About</h1><p>${readableText}</p></div>` } };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await service.ingestUrl('https://example.com/content/about', 'user-id');

    expect(result.pagesFetched).toBe(1);
    expect((savedChunks[0] as { content: string }).content).toContain('API About');
  });

  it('uses ScrapingAnt rendered fallback for unreadable SPA pages', async () => {
    const { service, savedChunks } = createService(100, {
      apiKey: 'scraping-ant-key',
      enabled: true,
      maxPagesPerIngest: 25,
    });
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://r.jina.ai/https://example.com/spa') {
        return { data: 'Title: SPA\n\nURL Source: https://example.com/spa' };
      }
      if (url === 'https://example.com/spa') {
        return { data: '<html><body><app-root></app-root></body></html>' };
      }
      if (url === 'https://api.scrapingant.com/v2/extended') {
        return {
          data: { text: `Rendered SPA content. ${readableText}` },
          headers: { 'ant-credits-cost': '10' },
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await service.ingestUrl('https://example.com/spa', 'user-id');

    expect(result.pagesFetched).toBe(1);
    expect((savedChunks[0] as { content: string }).content).toContain(
      'ScrapingAnt Source: rendered',
    );
    expect((savedChunks[0] as { content: string }).content).toContain(
      'Rendered SPA content',
    );
    expect(
      mockedAxios.get.mock.calls.filter(([url]) => url === 'https://api.scrapingant.com/v2/extended'),
    ).toHaveLength(1);
  });

  it('queues rendered ScrapingAnt HTML links without a second paid call for the same page', async () => {
    const { service, savedChunks } = createService(100, {
      apiKey: 'scraping-ant-key',
      enabled: true,
      maxPagesPerIngest: 25,
    });
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://r.jina.ai/https://example.com/spa') {
        return { data: 'Title: SPA\n\nURL Source: https://example.com/spa' };
      }
      if (url === 'https://example.com/spa') {
        return { data: '<html><body><app-root></app-root></body></html>' };
      }
      if (url === 'https://api.scrapingant.com/v2/extended') {
        return {
          data: {
            text: `Rendered root content. ${readableText}`,
            html: `<main><p>${readableText}</p><a href="/rendered-about">About</a></main>`,
          },
          headers: { 'ant-credits-cost': '10' },
        };
      }
      if (url === 'https://r.jina.ai/https://example.com/rendered-about') {
        return { data: `Title: Rendered About\n\n${readableText}` };
      }
      if (url === 'https://example.com/rendered-about') {
        return { data: '<main>No more links</main>' };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await service.ingestUrl('https://example.com/spa', 'user-id');

    expect(result.pagesFetched).toBe(2);
    expect(savedChunks).toHaveLength(2);
    expect(new Set(savedChunks.map((chunk) => (chunk as { url: string }).url))).toEqual(
      new Set(['https://example.com/spa', 'https://example.com/rendered-about']),
    );
    expect(
      mockedAxios.get.mock.calls.filter(([url]) => url === 'https://api.scrapingant.com/v2/extended'),
    ).toHaveLength(1);
  });

  it('sorts rendered ScrapingAnt links before enqueueing them', async () => {
    const { service, savedChunks } = createService(3, {
      apiKey: 'scraping-ant-key',
      enabled: true,
      maxPagesPerIngest: 10,
    });
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://r.jina.ai/https://example.com/spa') {
        return { data: 'Title: SPA\n\nURL Source: https://example.com/spa' };
      }
      if (url === 'https://example.com/spa') {
        return { data: '<html><body><app-root></app-root></body></html>' };
      }
      if (url === 'https://api.scrapingant.com/v2/extended') {
        return {
          data: {
            text: `Rendered root content. ${readableText}`,
            html: [
              `<main><p>${readableText}</p>`,
              '<a href="/blog/page/2">Blog</a>',
              '<a href="/terms-condition">Terms</a>',
              '<a href="/privacy-policy">Privacy</a>',
              '</main>',
            ].join(''),
          },
          headers: { 'ant-credits-cost': '10' },
        };
      }
      if (
        url === 'https://r.jina.ai/https://example.com/privacy-policy' ||
        url === 'https://r.jina.ai/https://example.com/terms-condition'
      ) {
        return { data: `Title: Rendered Page\n\n${readableText}` };
      }
      if (url === 'https://example.com/privacy-policy' || url === 'https://example.com/terms-condition') {
        return { data: '<main>No more links</main>' };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await service.ingestUrl('https://example.com/spa', 'user-id');

    expect(savedChunks.map((chunk) => (chunk as { url: string }).url)).toEqual([
      'https://example.com/spa',
      'https://example.com/privacy-policy',
      'https://example.com/terms-condition',
    ]);
  });

  it('enforces ScrapingAnt paid fallback cap per ingest', async () => {
    const { service } = createService(100, {
      apiKey: 'scraping-ant-key',
      enabled: true,
      maxPagesPerIngest: 1,
    });
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://r.jina.ai/https://example.com/spa') {
        return { data: 'Title: SPA\n\nURL Source: https://example.com/spa' };
      }
      if (url === 'https://example.com/spa') {
        return { data: '<html><body><app-root></app-root></body></html>' };
      }
      if (url === 'https://api.scrapingant.com/v2/extended') {
        return {
          data: {
            text: `Rendered root content. ${readableText}`,
            html: `<main><p>${readableText}</p><a href="/second-spa">Second</a></main>`,
          },
          headers: { 'ant-credits-cost': '10' },
        };
      }
      if (url === 'https://r.jina.ai/https://example.com/second-spa') {
        return { data: 'Title: Second\n\nURL Source: https://example.com/second-spa' };
      }
      if (url === 'https://example.com/second-spa') {
        return { data: '<html><body><app-root></app-root></body></html>' };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await service.ingestUrl('https://example.com/spa', 'user-id');

    expect(result.pagesFetched).toBe(1);
    expect(result.pagesFailed).toBe(1);
    expect(
      mockedAxios.get.mock.calls.filter(([url]) => url === 'https://api.scrapingant.com/v2/extended'),
    ).toHaveLength(1);
  });

  it('fails root ingest when ScrapingAnt fallback fails and no other content exists', async () => {
    const { service, webPageRepo } = createService(100, {
      apiKey: 'scraping-ant-key',
      enabled: true,
      maxPagesPerIngest: 25,
    });
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://r.jina.ai/https://example.com/spa') {
        return { data: 'Title: SPA\n\nURL Source: https://example.com/spa' };
      }
      if (url === 'https://example.com/spa') {
        return { data: '<html><body><app-root></app-root></body></html>' };
      }
      if (url === 'https://api.scrapingant.com/v2/extended') {
        throw new Error('ScrapingAnt unavailable');
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await expect(service.ingestUrl('https://example.com/spa', 'user-id')).rejects.toThrow(
      'ScrapingAnt fallback failed',
    );
    expect(webPageRepo.remove).toHaveBeenCalled();
  });

  it('counts unreadable linked SPA shells as failed instead of embedding metadata-only chunks', async () => {
    const { service, savedChunks } = createService();
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://r.jina.ai/https://example.com/') {
        return { data: `Title: Root\n\n${readableText}\n[Shell](/shell)` };
      }
      if (url === 'https://example.com/') {
        return { data: '<a href="/shell">Shell</a>' };
      }
      if (url === 'https://r.jina.ai/https://example.com/shell') {
        return { data: 'Title: Shell\n\nURL Source: https://example.com/shell' };
      }
      if (url === 'https://example.com/shell') {
        return { data: '<html><body><app-root></app-root><script src="/main.js"></script></body></html>' };
      }
      if (url === 'https://example.com/main.js') {
        return { data: 'console.log("no useful api")' };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await service.ingestUrl('https://example.com/', 'user-id');

    expect(result.pagesFetched).toBe(1);
    expect(result.pagesFailed).toBe(1);
    expect(savedChunks).toHaveLength(1);
    expect((savedChunks[0] as { content: string }).content).not.toContain('URL Source: https://example.com/shell');
  });

  it('seeds crawl queue from WordPress REST links when available', async () => {
    const { service } = createService();
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://example.com/wp-json/wp/v2/pages?per_page=100') {
        return { data: [{ link: 'https://example.com/blog/contact-us/' }] };
      }
      if (url === 'https://example.com/wp-json/wp/v2/posts?per_page=100') {
        return { data: [] };
      }
      if (url === 'https://r.jina.ai/https://example.com/') {
        return { data: `Title: Root\n\n${readableText}` };
      }
      if (url === 'https://r.jina.ai/https://example.com/blog/contact-us/') {
        return { data: `Title: Contact Us\n\n${readableText}` };
      }
      if (url === 'https://example.com/' || url === 'https://example.com/blog/contact-us/') {
        return { data: '<main>No extra links</main>' };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await service.ingestUrl('https://example.com/', 'user-id');

    expect(result.pagesFetched).toBe(2);
  });

  it('refetch deletes old chunks before crawling again', async () => {
    const { service, pages, chunkRepo } = createService();
    pages.set('page-id', {
      id: 'page-id',
      userId: 'user-id',
      url: 'https://example.com/',
      title: 'Old',
      chunksCreated: 10,
      pagesFetched: 1,
      pagesFailed: 0,
    } as WebPage);
    mockedAxios.get.mockResolvedValue({ data: `Title: New\n\n${readableText}` });

    const result = await service.refetchUrl('page-id', 'user-id');

    expect(chunkRepo.delete).toHaveBeenCalledWith({ webPageId: 'page-id' });
    expect(result.title).toBe('New');
    expect(result.chunksCreated).toBe(1);
  });
});
