import { createAgent } from 'langchain';
import { AiService } from './ai.service';

jest.mock('langchain', () => ({
  createAgent: jest.fn(() => ({
    invoke: jest.fn().mockResolvedValue({
      messages: [{ content: 'Agent answer' }],
    }),
  })),
}));

const mockedCreateAgent = createAgent as jest.Mock;

function createService() {
  const config = {
    get: jest.fn().mockReturnValue(10),
  };
  const llmFactory = {
    getChatModel: jest.fn().mockReturnValue({}),
    getEmbeddings: jest.fn(),
  };
  const retrievalService = {
    searchDocuments: jest.fn().mockResolvedValue('Document result'),
    searchImages: jest.fn().mockResolvedValue('Image result'),
    searchWebPages: jest.fn().mockResolvedValue('Web page result'),
  };
  const toolRetrievalService = {
    cityToAirport: jest.fn().mockResolvedValue('{"matches":[{"code":"DAC"}]}'),
    buildFlightRedirect: jest.fn(),
    buildLiveAgentRedirect: jest.fn(),
  };

  return new AiService(
    config as never,
    llmFactory as never,
    retrievalService as never,
    toolRetrievalService as never,
  );
}

function registeredToolNames(): string[] {
  const call = mockedCreateAgent.mock.calls.at(-1)?.[0];
  return call.tools.map((tool: { name: string }) => tool.name);
}

describe('AiService agent tools', () => {
  beforeEach(() => {
    mockedCreateAgent.mockClear();
  });

  it('registers only retrieval tools when chat redirect tools are disabled', async () => {
    const service = createService();

    await service.runAgenticLoop('system', [], 'hello', 'user-1', undefined, [
      {
        toolKey: 'flight_search',
        enabled: false,
        config: {},
      },
      {
        toolKey: 'live_agent_contact',
        enabled: false,
        config: {},
      },
    ]);

    expect(registeredToolNames()).toEqual([
      'search_documents',
      'search_images',
      'search_web_pages',
    ]);
  });

  it('registers city and flight tools only when flight search is enabled', async () => {
    const service = createService();

    await service.runAgenticLoop('system', [], 'flight to Dhaka', 'user-1', undefined, [
      {
        toolKey: 'flight_search',
        enabled: true,
        config: {
          oneWayTemplateUrl: 'https://example.com/one-way',
          roundTripTemplateUrl: 'https://example.com/round-trip',
          multiCityTemplateUrl: 'https://example.com/multi-city',
        },
      },
    ]);

    expect(registeredToolNames()).toEqual([
      'search_documents',
      'search_images',
      'search_web_pages',
      'city_to_airport',
      'flight_search',
    ]);
  });

  it('registers live agent tool only when live agent contact is enabled', async () => {
    const service = createService();

    await service.runAgenticLoop('system', [], 'talk to human', 'user-1', undefined, [
      {
        toolKey: 'live_agent_contact',
        enabled: true,
        config: {
          redirectUrl: 'https://wa.me/8801000000000',
        },
      },
    ]);

    expect(registeredToolNames()).toEqual([
      'search_documents',
      'search_images',
      'search_web_pages',
      'live_agent_contact',
    ]);
  });
});
