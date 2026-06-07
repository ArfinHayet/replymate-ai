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

  function createService() {
    const config = { get: jest.fn().mockReturnValue(10) };
    const llmFactory = { getChatModel: jest.fn().mockReturnValue({}) };
    const retrievalService = {
      searchDocuments: jest.fn(),
      searchImages: jest.fn(),
      searchWebPages: jest.fn(),
    };
    const toolRetrievalService = {
      cityToAirport: jest.fn(),
      buildFlightRedirect: jest.fn(),
      buildLiveAgentRedirect: jest.fn(),
    };
    const visibleFlightAnalyzer = {
      analyzeVisibleFlightContext: jest.fn(),
    };

    return new AgenticLoopService(
      config as never,
      llmFactory as never,
      retrievalService as never,
      toolRetrievalService as never,
      visibleFlightAnalyzer as never,
    );
  }

  it('registers visible flight analysis tool when context exists', async () => {
    const service = createService();

    await service.runAgenticLoop('system', [], 'compare flights', 'user-1', undefined, [], {
      type: 'flight_list',
      totalFlights: 1,
      flights: [{ index: 1, rawText: 'Example Air BDT 5000' }],
    });

    const call = mockedCreateAgent.mock.calls.at(-1)?.[0];
    expect(call.tools.map((tool: { name: string }) => tool.name)).toEqual([
      'search_documents',
      'search_images',
      'search_web_pages',
      'analyze_visible_flights',
    ]);
  });
});
