import { HybridRetrievalService } from './hybrid-retrieval.service';

describe('HybridRetrievalService', () => {
  it('falls back to vector knowledge when graph evidence is empty', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          { content: 'Document answer about refund policy.', distance: '0.2' },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    };
    const config = { get: jest.fn().mockReturnValue(15) };
    const llmFactory = {
      getEmbeddings: jest.fn().mockReturnValue({
        embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      }),
    };
    const graph = {
      searchRelatedEvidence: jest.fn().mockResolvedValue([]),
    };

    const service = new HybridRetrievalService(
      dataSource as never,
      config as never,
      llmFactory as never,
      graph as never,
    );

    await expect(
      service.searchKnowledgeBase('refund policy', 'user-1'),
    ).resolves.toContain('Document answer about refund policy.');
    expect(graph.searchRelatedEvidence).toHaveBeenCalledWith('refund policy', 'user-1');
  });
});
