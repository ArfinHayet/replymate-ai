import { buildContextualToolQuery, Message } from './ai.service';

describe('buildContextualToolQuery', () => {
  const history: Message[] = [
    {
      role: 'user',
      parts: [{ text: 'tell me about Flights Nepal' }],
    },
    {
      role: 'model',
      parts: [{ text: 'Flights Nepal is a flight booking service.' }],
    },
  ];

  it('places standalone retrieval intent before recent conversation context', () => {
    const query = buildContextualToolQuery(
      'contact number',
      history,
      'contact number?',
      'Flights Nepal contact number phone helpline WhatsApp',
    );

    expect(query).toContain('Tool query: contact number');
    expect(query).toContain('Current user question: contact number?');
    expect(query).toContain(
      'Standalone retrieval intent:\nFlights Nepal contact number phone helpline WhatsApp',
    );
    expect(query).toContain(
      'Recent conversation context:\nUser: tell me about Flights Nepal',
    );
    expect(query.indexOf('Standalone retrieval intent')).toBeLessThan(
      query.indexOf('Recent conversation context'),
    );
  });

  it('keeps existing behavior when no retrieval intent is provided', () => {
    expect(buildContextualToolQuery('company overview', [], 'tell me about Flights Nepal')).toBe(
      'company overview',
    );

    const query = buildContextualToolQuery(
      'company overview',
      history,
      'tell me about Flights Nepal',
    );

    expect(query).toBe(
      [
        'Tool query: company overview',
        'Current user question: tell me about Flights Nepal',
        'Recent conversation context:\nUser: tell me about Flights Nepal\nAssistant: Flights Nepal is a flight booking service.',
      ].join('\n\n'),
    );
  });
});
