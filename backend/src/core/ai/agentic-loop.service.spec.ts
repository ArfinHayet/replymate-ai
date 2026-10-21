import { createAgent } from 'langchain';
import { AgenticLoopService } from './agentic-loop.service';

jest.mock('langchain', () => ({
  createAgent: jest.fn(() => ({
    invoke: jest.fn().mockResolvedValue({
      messages: [{ content: 'Agent answer' }],
    }),
  })),
}));

const mockedCreateAgent = createAgent as jest.Mock;

describe('AgenticLoopService', () => {
  beforeEach(() => {
    mockedCreateAgent.mockClear();
  });

  it('registers only knowledge-base retrieval tools', async () => {
    const config = { get: jest.fn().mockReturnValue(10) };
    const llmFactory = { getChatModel: jest.fn().mockReturnValue({}) };
    const retrievalService = {
      searchDocuments: jest.fn(),
      searchImages: jest.fn(),
      searchWebPages: jest.fn(),
    };
    const service = new AgenticLoopService(
      config as never,
      llmFactory as never,
      retrievalService as never,
    );

    await expect(
      service.runAgenticLoop('system', [], 'hello', 'user-1'),
    ).resolves.toEqual({ answer: 'Agent answer' });

    const call = mockedCreateAgent.mock.calls.at(-1)?.[0];
    expect(call.tools.map((registeredTool: { name: string }) => registeredTool.name)).toEqual([
      'search_documents',
      'search_images',
      'search_web_pages',
    ]);
    expect(call.systemPrompt).toBe('system');
  });
});
