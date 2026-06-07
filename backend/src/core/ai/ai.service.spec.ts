import { createAgent } from 'langchain';
import { AgenticLoopService } from './agentic-loop.service';
import { AiService } from './ai.service';
import { MediaAiService } from './media-ai.service';
import { QueryIntentClassifier } from './query-intent.classifier';
import { VisibleFlightAnalyzerService } from './visible-flights/visible-flight-analyzer.service';

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

  const queryIntentClassifier = new QueryIntentClassifier(llmFactory as never);
  const visibleFlightAnalyzer = new VisibleFlightAnalyzerService(queryIntentClassifier);
  const agenticLoopService = new AgenticLoopService(
    config as never,
    llmFactory as never,
    retrievalService as never,
    toolRetrievalService as never,
    visibleFlightAnalyzer,
  );
  const mediaAiService = new MediaAiService(llmFactory as never);

  return new AiService(
    queryIntentClassifier,
    agenticLoopService,
    visibleFlightAnalyzer,
    mediaAiService,
    llmFactory as never,
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

  it('registers visible flight analysis when context exists even without flight search', async () => {
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
      'analyze_visible_flights',
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

  it('filters Biman Bangladesh flights by a compact BDT fare range', async () => {
    const service = createService();

    const result = await service.analyzeVisibleFlightContext('Biman fare 10k to 15k', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'Biman Bangladesh DAC KUL BDT 12000 3h 55m',
          airline: 'Biman Bangladesh',
          price: 'BDT 12000',
        },
        {
          index: 2,
          rawText: 'Biman Bangladesh DAC KUL BDT 17000 3h 45m',
          airline: 'Biman Bangladesh',
          price: 'BDT 17000',
        },
        {
          index: 3,
          rawText: 'Onward Biman Bang... BG DAC KUL BDT 15000 4h',
          airline: 'Onward Biman Bang... BG',
          price: 'BDT 15000',
        },
      ],
    }, {
      filters: [
        { field: 'airline', operator: 'contains', value: 'Biman Bangladesh' },
        { field: 'price', operator: 'between', min: '10k', max: '15k' },
      ],
      selection: 'all_matches',
      label: 'Biman Bangladesh fare 10k to 15k BDT',
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [1, 3],
      label: 'Biman Bangladesh fare 10k to 15k BDT',
    });
    expect(result.selectedFlight?.index).toBe(1);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([1, 3]);
  });

  it('intersects airline refundability and fare-range criteria', async () => {
    const service = createService();

    const result = await service.analyzeVisibleFlightContext('Qatar refundable 8k to 9k', {
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
    }, {
      filters: [
        { field: 'airline', operator: 'contains', value: 'Qatar Airways' },
        { field: 'refundability', operator: 'equals', value: 'refundable' },
        { field: 'price', operator: 'between', min: 8000, max: 9000 },
      ],
      selection: 'all_matches',
      label: 'Qatar refundable fare 8k to 9k',
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [1],
      label: 'Qatar refundable fare 8k to 9k',
    });
    expect(result.selectedFlight?.index).toBe(1);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([1]);
  });

  it('selects the cheapest visible flight within combined filters', async () => {
    const service = createService();

    const result = await service.analyzeVisibleFlightContext('cheapest US-Bangla under 7000', {
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
    }, {
      filters: [
        { field: 'airline', operator: 'contains', value: 'US-Bangla' },
        { field: 'price', operator: 'less_than', value: 7000 },
      ],
      sort: 'price_asc',
      selection: 'single_best',
      label: 'Cheapest US-Bangla under 7000',
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_card',
      flightIndex: 2,
      label: 'Cheapest US-Bangla under 7000',
    });
    expect(result.selectedFlight?.index).toBe(2);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([2, 1]);
  });

  it('selects the fastest visible refundable flight', async () => {
    const service = createService();

    const result = await service.analyzeVisibleFlightContext('fastest refundable', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'Qatar Airways DAC DOH BDT 9500 6h Refundable',
          duration: '6h',
          refundability: 'Refundable',
        },
        {
          index: 2,
          rawText: 'Biman Bangladesh DAC KUL BDT 9100 4h 10m Refundable',
          duration: '4h 10m',
          refundability: 'Refundable',
        },
        {
          index: 3,
          rawText: 'US-Bangla DAC KUL BDT 8900 3h 55m Non-Refundable',
          duration: '3h 55m',
          refundability: 'Non-Refundable',
        },
      ],
    }, {
      filters: [{ field: 'refundability', operator: 'equals', value: 'refundable' }],
      sort: 'duration_asc',
      selection: 'single_best',
      label: 'Fastest refundable flight',
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_card',
      flightIndex: 2,
      label: 'Fastest refundable flight',
    });
    expect(result.selectedFlight?.index).toBe(2);
    expect(result.rankedFlights?.map((flight) => flight.index)).toEqual([2, 1]);
  });

  it('filters morning and evening departure windows', async () => {
    const service = createService();

    const morningResult = await service.analyzeVisibleFlightContext('morning flights', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'Qatar Airways DAC DOH 06:15 10:00 BDT 9500',
          departure: '06:15',
        },
        {
          index: 2,
          rawText: 'Biman Bangladesh DAC KUL 14:30 18:30 BDT 9100',
          departure: '14:30',
        },
        {
          index: 3,
          rawText: 'US-Bangla DAC KUL 19:45 23:30 BDT 8900',
          departure: '19:45',
        },
      ],
    }, {
      filters: [{ field: 'departure', operator: 'between', min: 300, max: 719 }],
      selection: 'all_matches',
      label: 'Morning departures',
    });

    const eveningResult = await service.analyzeVisibleFlightContext('evening flights', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        { index: 1, rawText: 'Qatar Airways DAC DOH 06:15 10:00 BDT 9500', departure: '06:15' },
        { index: 2, rawText: 'Biman Bangladesh DAC KUL 14:30 18:30 BDT 9100', departure: '14:30' },
        { index: 3, rawText: 'US-Bangla DAC KUL 19:45 23:30 BDT 8900', departure: '19:45' },
      ],
    }, {
      filters: [{ field: 'departure', operator: 'between', min: 1020, max: 1259 }],
      selection: 'all_matches',
      label: 'Evening departures',
    });

    expect(morningResult.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [1],
      label: 'Morning departures',
    });
    expect(eveningResult.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [3],
      label: 'Evening departures',
    });
  });

  it('filters flights with 20kg baggage or more', async () => {
    const service = createService();

    const result = await service.analyzeVisibleFlightContext('20kg baggage or more', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'Budget Air DAC KUL BDT 7500 15kg',
          baggage: '15kg',
        },
        {
          index: 2,
          rawText: 'US-Bangla DAC KUL BDT 8500 20kg',
          baggage: '20kg',
        },
        {
          index: 3,
          rawText: 'Biman Bangladesh DAC KUL BDT 9500 30kg',
          baggage: '30kg',
        },
      ],
    }, {
      filters: [{ field: 'baggage', operator: 'greater_than_or_equal', value: 20 }],
      selection: 'all_matches',
      label: '20kg baggage or more',
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [2, 3],
      label: '20kg baggage or more',
    });
  });

  it('uses raw card text for arbitrary visible filters', async () => {
    const service = createService();

    const result = await service.analyzeVisibleFlightContext('meal included flights', {
      type: 'flight_list',
      totalFlights: 3,
      flights: [
        {
          index: 1,
          rawText: 'Qatar Airways DAC DOH BDT 9500 Meal included',
        },
        {
          index: 2,
          rawText: 'Biman Bangladesh DAC KUL BDT 9100 No meal',
        },
        {
          index: 3,
          rawText: 'US-Bangla DAC KUL BDT 8900 Student fare Meal Included',
        },
      ],
    }, {
      filters: [{ field: 'rawText', operator: 'contains', value: 'meal included' }],
      selection: 'all_matches',
      label: 'Meal included flights',
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [1, 3],
      label: 'Meal included flights',
    });
  });

  it('does not return DOM manipulation when criteria have no matches', async () => {
    const service = createService();

    const result = await service.analyzeVisibleFlightContext('US-Bangla refundable under 6000', {
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
    }, {
      filters: [
        { field: 'airline', operator: 'contains', value: 'US-Bangla' },
        { field: 'refundability', operator: 'equals', value: 'refundable' },
        { field: 'price', operator: 'less_than', value: 6000 },
      ],
      selection: 'all_matches',
      label: 'US-Bangla refundable flights under 6000',
    });

    expect(result.answer).toContain('US-Bangla refundable flights under 6000');
    expect(result.dommanipulate).toBeUndefined();
    expect(result.rankedFlights).toEqual([]);
  });

  it('does not fall back to regex/default cheapest when classifier criteria are unavailable', async () => {
    const service = createService();

    const result = await service.analyzeVisibleFlightContext('cheapest flight', {
      type: 'flight_list',
      totalFlights: 2,
      flights: [
        {
          index: 1,
          rawText: 'Expensive Air DAC KUL BDT 9000',
          price: 'BDT 9000',
        },
        {
          index: 2,
          rawText: 'Budget Air DAC KUL BDT 5400',
          price: 'BDT 5400',
        },
      ],
    });

    expect(result.answer).toContain('could not infer');
    expect(result.dommanipulate).toBeUndefined();
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

    const queryIntentClassifier = new QueryIntentClassifier(llmFactory as never);
    const visibleFlightAnalyzer = new VisibleFlightAnalyzerService(queryIntentClassifier);
    const agenticLoopService = new AgenticLoopService(
        config as never,
        llmFactory as never,
        retrievalService as never,
        toolRetrievalService as never,
        visibleFlightAnalyzer,
    );
    const mediaAiService = new MediaAiService(llmFactory as never);

    return {
      service: new AiService(
        queryIntentClassifier,
        agenticLoopService,
        visibleFlightAnalyzer,
        mediaAiService,
        llmFactory as never,
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
      'compare these visible options',
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
    expect(invoke.mock.calls[0][0][0].content).toContain('Visible flight summary:');
    expect(invoke.mock.calls[0][0][0].content).toContain('#1');
    expect(invoke.mock.calls[0][0][0].content).toContain('text=Example Air DAC DXB USD 420');
  });

  it('uses AI classification for visible airline filter phrasing', async () => {
    const { service, withStructuredOutput, invoke } = createClassifierService(
      jest.fn().mockResolvedValue({
        isFollowUp: false,
        intent: 'flight_list_query',
        resolvedQuery: 'show Emirates flights from the visible list',
      }),
    );

    const result = await service.classifyQueryIntent(
      [],
      'fly emirat flights',
      undefined,
      {
        type: 'flight_list',
        totalFlights: 2,
        flights: [
          {
            index: 1,
            rawText: 'Emirates DAC DXB BDT 8200',
            airline: 'Emirates',
          },
          {
            index: 2,
            rawText: 'Qatar Airways DAC DOH BDT 7600',
            airline: 'Qatar Airways',
          },
        ],
      },
    );

    expect(result).toEqual({
      isFollowUp: false,
      intent: 'flight_list_query',
      resolvedQuery: 'show Emirates flights from the visible list',
    });
    expect(withStructuredOutput).toHaveBeenCalled();
    expect(invoke.mock.calls[0][0][0].content).toContain('Current user message: fly emirat flights');
    expect(invoke.mock.calls[0][0][0].content).toContain('visible airline filters');
  });

  it('does not force route and date searches into flight list query', async () => {
    const { service, invoke } = createClassifierService(
      jest.fn().mockResolvedValue({
        isFollowUp: false,
        intent: 'direct',
        resolvedQuery: 'Dhaka to Dubai tomorrow',
      }),
    );

    const result = await service.classifyQueryIntent(
      [],
      'Dhaka to Dubai tomorrow',
      undefined,
      {
        type: 'flight_list',
        totalFlights: 1,
        flights: [
          {
            index: 1,
            rawText: 'Emirates DAC DXB BDT 8200',
          },
        ],
      },
    );

    expect(result).toEqual({
      isFollowUp: false,
      intent: 'direct',
      resolvedQuery: 'Dhaka to Dubai tomorrow',
    });
    expect(invoke).toHaveBeenCalled();
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

    const queryIntentClassifier = new QueryIntentClassifier(llmFactory as never);
    const visibleFlightAnalyzer = new VisibleFlightAnalyzerService(queryIntentClassifier);
    const agenticLoopService = new AgenticLoopService(
        config as never,
        llmFactory as never,
        retrievalService as never,
        toolRetrievalService as never,
        visibleFlightAnalyzer,
    );
    const mediaAiService = new MediaAiService(llmFactory as never);

    return {
      service: new AiService(
        queryIntentClassifier,
        agenticLoopService,
        visibleFlightAnalyzer,
        mediaAiService,
        llmFactory as never,
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
