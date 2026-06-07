import { VisibleFlightAnalyzerService } from './visible-flight-analyzer.service';

describe('VisibleFlightAnalyzerService', () => {
  function createService(classification?: unknown) {
    return new VisibleFlightAnalyzerService({
      classifyQueryIntent: jest.fn().mockResolvedValue(
        classification ?? {
          isFollowUp: false,
          intent: 'direct',
          resolvedQuery: 'unclassified',
        },
      ),
    } as never);
  }

  it('highlights all visible flights that match supplied criteria', async () => {
    const service = createService();

    const result = await service.analyzeVisibleFlightContext('Biman 10k to 15k', {
      type: 'flight_list',
      totalFlights: 2,
      flights: [
        {
          index: 1,
          rawText: 'Biman Bangladesh DAC KUL BDT 12000',
          airline: 'Biman Bangladesh',
          price: 'BDT 12000',
        },
        {
          index: 2,
          rawText: 'Biman Bangladesh DAC KUL BDT 17000',
          airline: 'Biman Bangladesh',
          price: 'BDT 17000',
        },
      ],
    }, {
      filters: [
        { field: 'airline', operator: 'contains', value: 'Biman Bangladesh' },
        { field: 'price', operator: 'between', min: '10k', max: '15k' },
      ],
      selection: 'all_matches',
      label: 'Biman fare 10k to 15k',
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_cards',
      flightIndexes: [1],
      label: 'Biman fare 10k to 15k',
    });
  });

  it('uses classifier fallback when criteria are omitted', async () => {
    const service = createService({
      isFollowUp: false,
      intent: 'flight_list_query',
      resolvedQuery: 'cheapest',
      flightListCriteria: {
        sort: 'price_asc',
        selection: 'single_best',
        label: 'Cheapest flight',
      },
    });

    const result = await service.analyzeVisibleFlightContext('cheapest', {
      type: 'flight_list',
      totalFlights: 2,
      flights: [
        { index: 1, rawText: 'Expensive Air BDT 9000', price: 'BDT 9000' },
        { index: 2, rawText: 'Budget Air BDT 5000', price: 'BDT 5000' },
      ],
    });

    expect(result.dommanipulate).toEqual({
      type: 'highlight_flight_card',
      flightIndex: 2,
      label: 'Cheapest flight',
    });
  });
});
