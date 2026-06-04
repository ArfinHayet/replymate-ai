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
    getChatModelName: jest.fn().mockReturnValue('test-model'),
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

describe('AiService query intent classifier', () => {
  function createClassifierService(invoke: jest.Mock) {
    const config = {
      get: jest.fn().mockReturnValue(10),
    };
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    const llmFactory = {
      getChatModel: jest.fn().mockReturnValue({ withStructuredOutput }),
      getChatModelName: jest.fn().mockReturnValue('test-model'),
      getEmbeddings: jest.fn(),
    };
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

    return {
      service: new AiService(
        config as never,
        llmFactory as never,
        retrievalService as never,
        toolRetrievalService as never,
      ),
      withStructuredOutput,
      invoke,
    };
  }

  it('returns a structured standalone retrieval query', async () => {
    const { service, withStructuredOutput, invoke } = createClassifierService(
      jest.fn().mockResolvedValue({
        isFollowUp: true,
        intent: 'follow_up',
        resolvedQuery: 'Flights Nepal contact number phone support',
      }),
    );

    const result = await service.classifyQueryIntent(
      [
        {
          role: 'user',
          parts: [{ text: 'Tell me about Flights Nepal' }],
        },
      ],
      'contact number?',
      'Flights Nepal',
    );

    expect(result).toEqual({
      isFollowUp: true,
      intent: 'follow_up',
      resolvedQuery: 'Flights Nepal contact number phone support',
    });
    expect(withStructuredOutput).toHaveBeenCalled();
    expect(invoke.mock.calls[0][0][0].content).toContain('Current user message: contact number?');
  });

  it('falls back to a direct query if classification fails', async () => {
    const { service } = createClassifierService(
      jest.fn().mockRejectedValue(new Error('model unavailable')),
    );

    await expect(service.classifyQueryIntent([], 'hello')).resolves.toEqual({
      isFollowUp: false,
      intent: 'direct',
      resolvedQuery: 'hello',
    });
  });
});

describe('AiService PDF extraction', () => {
  function createPdfExtractionService(invoke: jest.Mock) {
    const config = {
      get: jest.fn().mockReturnValue(10),
    };
    const llmFactory = {
      getChatModel: jest.fn().mockReturnValue({ invoke }),
      getChatModelName: jest.fn().mockReturnValue('configured-model'),
      getEmbeddings: jest.fn(),
    };
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

    return {
      service: new AiService(
        config as never,
        llmFactory as never,
        retrievalService as never,
        toolRetrievalService as never,
      ),
      llmFactory,
    };
  }

  it('uses the configured chat model and sends PDF document content', async () => {
    const invoke = jest.fn().mockResolvedValue({ content: 'Extracted PDF text' });
    const { service, llmFactory } = createPdfExtractionService(invoke);

    const result = await service.extractTextFromPdf(Buffer.from('pdf bytes'), 'test.pdf');

    expect(result).toBe('Extracted PDF text');
    expect(llmFactory.getChatModel).toHaveBeenCalled();
    expect(llmFactory.getChatModelName).toHaveBeenCalled();

    const messages = invoke.mock.calls[0][0];
    expect(messages[0].content[0]).toMatchObject({
      type: 'application/pdf',
      data: Buffer.from('pdf bytes').toString('base64'),
    });
    expect(messages[0].content[0]).not.toHaveProperty('inlineData');
  });

  it('returns text from array message content', async () => {
    const invoke = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Array PDF text' }],
    });
    const { service } = createPdfExtractionService(invoke);

    await expect(service.extractTextFromPdf(Buffer.from('pdf'), 'test.pdf')).resolves.toBe(
      'Array PDF text',
    );
  });

  it('returns an empty string when the model fails', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('unsupported input'));
    const { service } = createPdfExtractionService(invoke);

    await expect(service.extractTextFromPdf(Buffer.from('pdf'), 'test.pdf')).resolves.toBe('');
  });
});
