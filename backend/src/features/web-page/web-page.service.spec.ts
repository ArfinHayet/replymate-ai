import FirecrawlApp from '@mendable/firecrawl-js';
import { WebPageService } from './web-page.service';

const mockCrawlUrl = jest.fn();

jest.mock('@mendable/firecrawl-js', () =>
  jest.fn().mockImplementation(() => ({
    crawlUrl: mockCrawlUrl,
  })),
);

describe('WebPageService Firecrawl ingestion', () => {
  const createService = () => {
    const embeddings = {
      embedDocuments: jest.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2])),
    };
    const chunkRepo = {
      create: jest.fn((data: unknown) => data),
      save: jest.fn(async (chunks: unknown[]) => chunks),
      delete: jest.fn(),
    };
    const service = new WebPageService(
      {
        create: jest.fn((data) => ({ id: 'page-id', ...data })),
        save: jest.fn(async (page) => page),
        remove: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
      } as never,
      chunkRepo as never,
      {
        get: jest.fn((key: string) => {
          if (key === 'firecrawl.apiKey') return 'firecrawl-key';
          if (key === 'rag.chunkSize') return 1000;
          if (key === 'rag.chunkOverlap') return 200;
          return undefined;
        }),
      } as never,
      { query: jest.fn() } as never,
      { getEmbeddings: jest.fn(() => embeddings) } as never,
      { refresh: jest.fn() } as never,
      { indexWebPageSource: jest.fn() } as never,
      { deleteSourceGraph: jest.fn() } as never,
    );

    return { service, chunkRepo };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Firecrawl with SPA-friendly crawl options and filters image-only markdown', async () => {
    mockCrawlUrl.mockResolvedValue({
      success: true,
      data: [
        {
          markdown: 'This is a useful markdown page with enough readable content to keep.',
          metadata: { sourceURL: 'https://example.com/about', title: 'About' },
        },
        {
          markdown: 'Too short',
          metadata: { sourceURL: 'https://example.com/short', title: 'Short' },
        },
        {
          markdown:
            '![Hero](https://example.com/hero.png)\n![Gallery](https://example.com/gallery.png)\n![Avatar](https://example.com/avatar.png)',
          metadata: { sourceURL: 'https://example.com/images', title: 'Images' },
        },
      ],
    });

    const { service } = createService();
    const pages = await (service as unknown as {
      crawlPages(url: string, maxPages: number): Promise<unknown[]>;
    }).crawlPages('https://example.com/', 5);

    expect(FirecrawlApp).toHaveBeenCalledWith({ apiKey: 'firecrawl-key' });
    expect(mockCrawlUrl).toHaveBeenCalledWith('https://example.com/', {
      limit: 5,
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
    });
    expect(pages).toEqual([
      {
        url: 'https://example.com/about',
        title: 'About',
        markdown: 'This is a useful markdown page with enough readable content to keep.',
      },
    ]);
  });

  it('removes null bytes before splitting and saving chunks', async () => {
    const { service } = createService();
    const splitter = {
      createDocuments: jest.fn(async ([content]: string[]) => [
        { pageContent: content },
      ]),
    };

    await (service as unknown as {
      persistMarkdownChunks(
        page: { id: string },
        userId: string,
        sourceUrl: string,
        markdown: string,
        splitter: typeof splitter,
        startChunkIndex: number,
      ): Promise<number>;
    }).persistMarkdownChunks(
      { id: 'page-id' },
      'user-id',
      'https://example.com/',
      'Title\0\n\nReadable content with enough words to become a web page chunk.',
      splitter,
      0,
    );

    expect(splitter.createDocuments).toHaveBeenCalledWith([
      'Title\n\nReadable content with enough words to become a web page chunk.',
    ]);
  });
});
