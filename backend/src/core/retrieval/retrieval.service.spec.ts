import { RetrievalService } from './retrieval.service';

function createService() {
  const dataSource = {
    query: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'rag.topK') return 5;
      return undefined;
    }),
  };
  const embeddings = {
    embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  };
  const llmFactory = {
    getEmbeddings: jest.fn(() => embeddings),
  };

  return {
    service: new RetrievalService(
      dataSource as never,
      config as never,
      llmFactory as never,
    ),
    dataSource,
    embeddings,
  };
}

describe('RetrievalService', () => {
  it('uses lexical web page fallback when vector search misses exact terms content', async () => {
    const { service, dataSource } = createService();
    dataSource.query
      .mockResolvedValueOnce([
        {
          content: 'Unrelated chunk',
          url: 'https://example.com/',
          distance: '0.91',
        },
      ])
      .mockResolvedValueOnce([
        {
          content:
            'Terms and Condition\nWelcome to our platform. 1. Using the Platform',
          url: 'https://template2.myota.xyz/cms?page=terms-condition',
        },
      ]);

    const result = await service.searchWebPages('Terms and condition', 'user-1');

    expect(result).toContain('Terms and Condition');
    expect(result).toContain('https://template2.myota.xyz/cms?page=terms-condition');
    expect(dataSource.query).toHaveBeenCalledTimes(2);
    expect(dataSource.query.mock.calls[1][1]).toEqual(
      expect.arrayContaining(['%terms%']),
    );
  });
});
