import { AiService } from './ai.service';
import { MediaAiService } from './media-ai.service';
import { QueryIntentClassifier } from './query-intent.classifier';

describe('AiService query intent classifier', () => {
  function createService(invoke: jest.Mock) {
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    const llmFactory = {
      getChatModel: jest.fn().mockReturnValue({ withStructuredOutput }),
      getChatModelName: jest.fn().mockReturnValue('test-model'),
      getEmbeddings: jest.fn(),
    };
    const queryIntentClassifier = new QueryIntentClassifier(llmFactory as never);
    const mediaAiService = new MediaAiService(llmFactory as never);
    const agenticLoopService = { runAgenticLoop: jest.fn() };

    return {
      service: new AiService(
        queryIntentClassifier,
        agenticLoopService as never,
        mediaAiService,
        llmFactory as never,
      ),
      withStructuredOutput,
      invoke,
    };
  }

  it('returns a structured standalone retrieval query', async () => {
    const { service, withStructuredOutput, invoke } = createService(
      jest.fn().mockResolvedValue({
        isFollowUp: true,
        intent: 'follow_up',
        resolvedQuery: 'Flights Nepal contact number phone support',
      }),
    );

    const result = await service.classifyQueryIntent(
      [{ role: 'user', parts: [{ text: 'Tell me about Flights Nepal' }] }],
      'contact number?',
      'Flights Nepal',
    );

    expect(result).toEqual({
      isFollowUp: true,
      intent: 'follow_up',
      resolvedQuery: 'Flights Nepal contact number phone support',
    });
    expect(withStructuredOutput).toHaveBeenCalled();
    expect(invoke.mock.calls[0][0][0].content).toContain(
      'Current user message: contact number?',
    );
  });

  it('falls back to a direct query if classification fails', async () => {
    const { service } = createService(
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
  function createService(invoke: jest.Mock) {
    const llmFactory = {
      getChatModel: jest.fn().mockReturnValue({ invoke }),
      getChatModelName: jest.fn().mockReturnValue('configured-model'),
      getEmbeddings: jest.fn(),
    };
    const queryIntentClassifier = new QueryIntentClassifier(llmFactory as never);
    const mediaAiService = new MediaAiService(llmFactory as never);
    const agenticLoopService = { runAgenticLoop: jest.fn() };

    return {
      service: new AiService(
        queryIntentClassifier,
        agenticLoopService as never,
        mediaAiService,
        llmFactory as never,
      ),
      llmFactory,
    };
  }

  it('uses the configured chat model and sends PDF document content', async () => {
    const invoke = jest.fn().mockResolvedValue({ content: 'Extracted PDF text' });
    const { service, llmFactory } = createService(invoke);

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
    const { service } = createService(invoke);

    await expect(service.extractTextFromPdf(Buffer.from('pdf'), 'test.pdf')).resolves.toBe(
      'Array PDF text',
    );
  });

  it('returns an empty string when the model fails', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('unsupported input'));
    const { service } = createService(invoke);

    await expect(service.extractTextFromPdf(Buffer.from('pdf'), 'test.pdf')).resolves.toBe('');
  });
});
