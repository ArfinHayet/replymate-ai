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

  it('registers visible flight analysis only when flight search is enabled and context exists', async () => {
    const service = createService();

    await service.runAgenticLoop('system', [], 'Find cheapest flight', 'user-1', undefined, [
      {
        toolKey: 'flight_search',
        enabled: true,
        config: {
          oneWayTemplateUrl: 'https://example.com/one-way',
        },
      },
    ], {
      type: 'flight_list',
      totalFlights: 1,
      flights: [
        {
          index: 1,
          rawText: 'Example Air DAC DXB USD 420 5h 20kg',
          price: 'USD 420',
          duration: '5h',
          baggage: '20kg',
        },
      ],
    });

    expect(registeredToolNames()).toEqual([
      'search_documents',
      'search_images',
      'search_web_pages',
      'city_to_airport',
      'flight_search',
      'analyze_visible_flights',
    ]);
  });

  it('does not register visible flight analysis when flight search is disabled', async () => {
    const service = createService();

    await service.runAgenticLoop('system', [], 'Find cheapest flight', 'user-1', undefined, [], {
      type: 'flight_list',
      totalFlights: 1,
      flights: [
        {
          index: 1,
          rawText: 'Example Air DAC DXB USD 420',
        },
      ],
    });

    expect(registeredToolNames()).toEqual([
      'search_documents',
      'search_images',
      'search_web_pages',
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

  it('labels stop-count visible flight results instead of defaulting to cheapest flight', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        dommanipulate?: { flightIndexes?: number[]; label?: string; type: string };
        selectedFlight?: { index: number };
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('show flights with 0 stops', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'Onward Biman DAC KUL BDT 4705 3h 55m 0 stops',
          price: 'BDT 4705',
          duration: '3h 55m',
          stops: '0 stops',
        },
        {
          index: 2,
          rawText: 'One Stop Air DAC KUL BDT 3900 8h 10m 1 stops',
          price: 'BDT 3900',
          duration: '8h 10m',
          stops: '1 stops',
        },
        {
          index: 3,
          rawText: 'US-Bangla DAC KUL BDT 4985 3h 55m 0 stops',
          price: 'BDT 4985',
          duration: '3h 55m',
          stops: '0 stops',
        },
      ],
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [1, 3],
      label: '0 stops flights',
    });
    expect(result.selectedFlight?.index).toBe(1);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([1, 3]);
  });

  it('does not return DOM manipulation when fare-threshold filters have no matches', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        answer: string;
        dommanipulate?: unknown;
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('find flights with fare above 17000', {
      type: 'flight_list',
      totalFlights: 2,
      flights: [
        {
          index: 1,
          rawText: 'Biman DAC KUL BDT 4705 3h 55m 0 stops',
          price: 'BDT 4705',
        },
        {
          index: 2,
          rawText: 'US-Bangla DAC KUL BDT 4985 3h 55m 0 stops',
          price: 'BDT 4985',
        },
      ],
    });

    expect(result.answer).toContain('fare above 17000');
    expect(result.dommanipulate).toBeUndefined();
    expect(result.rankedFlights).toEqual([]);
  });

  it('highlights all visible Qatar Airways flights', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        dommanipulate?: { flightIndexes?: number[]; label?: string; type: string };
        selectedFlight?: { index: number };
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('Qatar Airways flights', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'Qatar Airways DAC DOH USD 520 5h 20kg Refundable',
          airline: 'Qatar Airways',
          price: 'USD 520',
        },
        {
          index: 2,
          rawText: 'Qatar Airw DAC DOH USD 490 5h 10m 20kg Non-Refundable',
          airline: 'Qatar Airw',
          price: 'USD 490',
        },
        {
          index: 3,
          rawText: 'Biman Bangladesh DAC KUL USD 410 4h 20kg Refundable',
          airline: 'Biman Bangladesh',
          price: 'USD 410',
        },
      ],
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [1, 2],
      label: 'Qatar Airways flights',
    });
    expect(result.selectedFlight?.index).toBe(1);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([1, 2]);
  });

  it('highlights all visible US-Bangla flights without defaulting to cheapest flight', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        dommanipulate?: { flightIndexes?: number[]; label?: string; type: string };
        selectedFlight?: { index: number };
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('US-Bangla flights', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'Budget Air DAC KUL USD 250 8h 15kg',
          airline: 'Budget Air',
          price: 'USD 250',
        },
        {
          index: 2,
          rawText: 'US-Bangla DAC KUL USD 390 4h 20kg',
          airline: 'US-Bangla',
          price: 'USD 390',
        },
        {
          index: 3,
          rawText: 'BS DAC KUL USD 410 4h 10m 20kg',
          airline: 'BS',
          price: 'USD 410',
        },
      ],
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [2, 3],
      label: 'US-Bangla flights',
    });
    expect(result.selectedFlight?.index).toBe(2);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([2, 3]);
  });

  it('highlights all visible non-refundable flights', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        dommanipulate?: { flightIndexes?: number[]; label?: string; type: string };
        selectedFlight?: { index: number };
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('non-refundable flights', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'Qatar Airways DAC DOH USD 520 5h Non Refundable',
        },
        {
          index: 2,
          rawText: 'Biman Bangladesh DAC KUL USD 410 4h Refundable',
          refundability: 'Refundable',
        },
        {
          index: 3,
          rawText: 'US-Bangla DAC KUL USD 390 4h Nonrefundable',
        },
      ],
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [1, 3],
      label: 'Non-refundable flights',
    });
    expect(result.selectedFlight?.index).toBe(1);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([1, 3]);
  });

  it('highlights refundable flights while excluding non-refundable cards', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        dommanipulate?: { flightIndexes?: number[]; label?: string; type: string };
        selectedFlight?: { index: number };
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('refundable flights', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'Qatar Airways DAC DOH USD 520 5h Non-Refundable',
        },
        {
          index: 2,
          rawText: 'Biman Bangladesh DAC KUL USD 410 4h Refundable',
        },
        {
          index: 3,
          rawText: 'US-Bangla DAC KUL USD 390 4h Non Refundable',
        },
      ],
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [2],
      label: 'Refundable flights',
    });
    expect(result.selectedFlight?.index).toBe(2);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([2]);
  });

  it('does not return DOM manipulation for unknown airline filters with no matches', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        answer: string;
        dommanipulate?: unknown;
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('Emirates flights', {
      type: 'flight_list',
      totalFlights: 2,
      flights: [
        {
          index: 1,
          rawText: 'Budget Air DAC KUL USD 250 8h 15kg',
          price: 'USD 250',
        },
        {
          index: 2,
          rawText: 'US-Bangla DAC KUL USD 390 4h 20kg',
          price: 'USD 390',
        },
      ],
    });

    expect(result.answer).toContain('Emirates');
    expect(result.dommanipulate).toBeUndefined();
    expect(result.rankedFlights).toEqual([]);
  });

  it('intersects airline and fare filters for visible flight groups', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        dommanipulate?: { flightIndexes?: number[]; label?: string; type: string };
        selectedFlight?: { index: number };
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('flights from us bangla and fare less than 7000', {
      type: 'flight_list',
      totalFlights: 4,
      flights: [
        {
          index: 1,
          rawText: 'US-Bangla DAC KUL BDT 6500 4h 20kg',
          airline: 'US-Bangla',
          price: 'BDT 6500',
        },
        {
          index: 2,
          rawText: 'US-Bangla DAC KUL BDT 7200 4h 10m 20kg',
          airline: 'US-Bangla',
          price: 'BDT 7200',
        },
        {
          index: 3,
          rawText: 'Biman Bangladesh DAC KUL BDT 6100 4h 20kg',
          airline: 'Biman Bangladesh',
          price: 'BDT 6100',
        },
        {
          index: 4,
          rawText: 'BS DAC KUL BDT 6900 4h 5m 20kg',
          airline: 'BS',
          price: 'BDT 6900',
        },
      ],
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [1, 4],
      label: 'US-Bangla flights, fare below 7000',
    });
    expect(result.selectedFlight?.index).toBe(1);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([1, 4]);
  });

  it('intersects airline refundability and fare filters', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        dommanipulate?: { flightIndexes?: number[]; label?: string; type: string };
        selectedFlight?: { index: number };
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('Qatar refundable flights under 9000', {
      type: 'flight_list',
      totalFlights: 4,
      flights: [
        {
          index: 1,
          rawText: 'Qatar Airways DAC DOH BDT 8500 5h Refundable',
          airline: 'Qatar Airways',
          price: 'BDT 8500',
          refundability: 'Refundable',
        },
        {
          index: 2,
          rawText: 'Qatar Airways DAC DOH BDT 8200 5h Non-Refundable',
          airline: 'Qatar Airways',
          price: 'BDT 8200',
          refundability: 'Non-Refundable',
        },
        {
          index: 3,
          rawText: 'Biman Bangladesh DAC DOH BDT 7800 5h Refundable',
          airline: 'Biman Bangladesh',
          price: 'BDT 7800',
          refundability: 'Refundable',
        },
        {
          index: 4,
          rawText: 'Qatar Airways DAC DOH BDT 9500 5h Refundable',
          airline: 'Qatar Airways',
          price: 'BDT 9500',
          refundability: 'Refundable',
        },
      ],
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [1],
      label: 'Refundable flights, Qatar Airways flights, fare below 9000',
    });
    expect(result.selectedFlight?.index).toBe(1);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([1]);
  });

  it('selects the cheapest visible flight within combined filters', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        dommanipulate?: { flightIndex?: number; label?: string; type: string };
        selectedFlight?: { index: number };
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('cheapest US-Bangla flights under 7000', {
      type: 'flight_list',
      totalFlights: 4,
      flights: [
        {
          index: 1,
          rawText: 'US-Bangla DAC KUL BDT 6500 4h 20kg',
          airline: 'US-Bangla',
          price: 'BDT 6500',
        },
        {
          index: 2,
          rawText: 'US-Bangla DAC KUL BDT 6200 4h 30m 20kg',
          airline: 'US-Bangla',
          price: 'BDT 6200',
        },
        {
          index: 3,
          rawText: 'US-Bangla DAC KUL BDT 7200 4h 20kg',
          airline: 'US-Bangla',
          price: 'BDT 7200',
        },
        {
          index: 4,
          rawText: 'Biman Bangladesh DAC KUL BDT 5900 4h 20kg',
          airline: 'Biman Bangladesh',
          price: 'BDT 5900',
        },
      ],
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_card',
      flightIndex: 2,
      label: 'Cheapest US-Bangla flights, fare below 7000',
    });
    expect(result.selectedFlight?.index).toBe(2);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([2, 1]);
  });

  it('does not return DOM manipulation when combined filters have no matches', () => {
    const service = createService();

    const result = (service as never as {
      analyzeVisibleFlights: (query: string, context: unknown) => {
        answer: string;
        dommanipulate?: unknown;
        rankedFlights?: { index: number }[];
      };
    }).analyzeVisibleFlights('US-Bangla refundable flights under 6000', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'US-Bangla DAC KUL BDT 6500 4h Non-Refundable',
          airline: 'US-Bangla',
          price: 'BDT 6500',
          refundability: 'Non-Refundable',
        },
        {
          index: 2,
          rawText: 'US-Bangla DAC KUL BDT 7200 4h Refundable',
          airline: 'US-Bangla',
          price: 'BDT 7200',
          refundability: 'Refundable',
        },
        {
          index: 3,
          rawText: 'Budget Air DAC KUL BDT 5400 4h Refundable',
          airline: 'Budget Air',
          price: 'BDT 5400',
          refundability: 'Refundable',
        },
      ],
    });

    expect(result.answer).toContain('US-Bangla flights');
    expect(result.dommanipulate).toBeUndefined();
    expect(result.rankedFlights).toEqual([]);
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

  it('includes flight list context in classification prompts', async () => {
    const { service, invoke } = createClassifierService(
      jest.fn().mockResolvedValue({
        isFollowUp: false,
        intent: 'flight_list_query',
        resolvedQuery: 'find cheapest visible flight',
      }),
    );

    const result = await service.classifyQueryIntent(
      [],
      'Find cheapest flight',
      undefined,
      {
        type: 'flight_list',
        totalFlights: 3,
        flights: [
          {
            index: 1,
            rawText: 'Example Air DAC DXB USD 420',
          },
        ],
      },
    );

    expect(result).toEqual({
      isFollowUp: false,
      intent: 'flight_list_query',
      resolvedQuery: 'find cheapest visible flight',
    });
    expect(invoke.mock.calls[0][0][0].content).toContain(
      'Flight list context: present with 3 visible flights',
    );
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
