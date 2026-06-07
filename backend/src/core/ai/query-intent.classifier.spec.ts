import { QueryIntentClassifier } from './query-intent.classifier';

describe('QueryIntentClassifier', () => {
  function createClassifier(invoke: jest.Mock) {
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    const llmFactory = {
      getChatModel: jest.fn().mockReturnValue({ withStructuredOutput }),
    };

    return {
      classifier: new QueryIntentClassifier(llmFactory as never),
      invoke,
      withStructuredOutput,
    };
  }

  it('returns visible-flight criteria from structured model output', async () => {
    const { classifier, invoke } = createClassifier(
      jest.fn().mockResolvedValue({
        isFollowUp: false,
        intent: 'flight_list_query',
        resolvedQuery: 'Biman fare 10k to 15k',
        flightListCriteria: {
          filters: [
            { field: 'airline', operator: 'contains', value: 'Biman Bangladesh' },
            { field: 'price', operator: 'between', min: 10000, max: 15000 },
          ],
          selection: 'all_matches',
          label: 'Biman fare 10k to 15k',
        },
      }),
    );

    const result = await classifier.classifyQueryIntent(
      [],
      'Flight from Biman Bangladesh, fare ranging 10 to 15k BDT',
      undefined,
      {
        type: 'flight_list',
        totalFlights: 1,
        flights: [{ index: 1, rawText: 'Biman Bangladesh BDT 12000' }],
      },
    );

    expect(result.flightListCriteria?.filters).toHaveLength(2);
    expect(invoke.mock.calls[0][0][0].content).toContain('fare ranging 10 to 15k BDT');
  });

  it('falls back to direct when classification fails', async () => {
    const { classifier } = createClassifier(
      jest.fn().mockRejectedValue(new Error('model unavailable')),
    );

    await expect(classifier.classifyQueryIntent([], 'hello')).resolves.toEqual({
      isFollowUp: false,
      intent: 'direct',
      resolvedQuery: 'hello',
    });
  });
});
