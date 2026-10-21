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

  it('classifies ordinary follow-up questions from history and company context', async () => {
    const { classifier, invoke } = createClassifier(
      jest.fn().mockResolvedValue({
        isFollowUp: true,
        intent: 'follow_up',
        resolvedQuery: 'Flights Nepal contact number',
      }),
    );

    const result = await classifier.classifyQueryIntent(
      [{ role: 'user', parts: [{ text: 'Tell me about Flights Nepal' }] }],
      'their contact number?',
      'Flights Nepal',
    );

    expect(result).toEqual({
      isFollowUp: true,
      intent: 'follow_up',
      resolvedQuery: 'Flights Nepal contact number',
    });
    expect(invoke.mock.calls[0][0][0].content).toContain(
      'Current user message: their contact number?',
    );
    expect(invoke.mock.calls[0][0][0].content).not.toMatch(/flight list|product list/i);
  });

  it('includes the unanswered question when classifying a clarification reply', async () => {
    const { classifier, invoke } = createClassifier(
      jest.fn().mockResolvedValue({
        isFollowUp: true,
        intent: 'follow_up',
        resolvedQuery: 'Flights Nepal contact number',
      }),
    );

    const result = await classifier.classifyQueryIntent(
      [
        { role: 'user', parts: [{ text: 'contact number?' }] },
        {
          role: 'model',
          parts: [{ text: 'Which company or organization do you mean?' }],
        },
      ],
      'Flights Nepal',
      undefined,
      'contact number?',
    );

    expect(result.resolvedQuery).toBe('Flights Nepal contact number');
    const prompt = invoke.mock.calls[0][0][0].content as string;
    expect(prompt).toContain(
      'Pending clarification. The assistant asked "Which company or organization do you mean?" for the original unanswered user question: contact number?'
    );
    expect(prompt).toContain(
      'combine it with the original unanswered question'
    );
    expect(prompt).toContain(
      'do not combine it with the pending question'
    );
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

  it('combines a clarification reply with the pending question if classification fails', async () => {
    const { classifier } = createClassifier(
      jest.fn().mockRejectedValue(new Error('model unavailable')),
    );

    await expect(
      classifier.classifyQueryIntent(
        [],
        'Flights Nepal',
        undefined,
        'contact number?',
      ),
    ).resolves.toEqual({
      isFollowUp: true,
      intent: 'follow_up',
      resolvedQuery: 'Flights Nepal contact number?',
    });
  });
});
