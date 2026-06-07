import { KnowledgeGraphService } from './knowledge-graph.service';
import { randomUUID } from 'crypto';

function createRepo() {
  return {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: value.id ?? randomUUID(), ...value })),
    delete: jest.fn(),
  };
}

describe('KnowledgeGraphService', () => {
  it('traverses relation evidence scoped to the user', async () => {
    const entityRepo = createRepo();
    const mentionRepo = createRepo();
    const relationRepo = createRepo();
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: '11111111-1111-1111-1111-111111111111' }])
        .mockResolvedValueOnce([
          {
            from_name: 'Flights Nepal',
            relation_type: 'located_at',
            to_name: 'Kathmandu Office',
            evidence_text: 'Flights Nepal is located in Kathmandu.',
            confidence: 0.9,
            depth: 1,
          },
        ]),
    };

    const service = new KnowledgeGraphService(
      entityRepo as never,
      mentionRepo as never,
      relationRepo as never,
      dataSource as never,
    );

    await expect(
      service.searchRelatedEvidence('Flights Nepal office location', 'user-1'),
    ).resolves.toEqual([
      {
        from: 'Flights Nepal',
        relationType: 'located_at',
        to: 'Kathmandu Office',
        evidenceText: 'Flights Nepal is located in Kathmandu.',
        confidence: 0.9,
        depth: 1,
      },
    ]);

    expect(dataSource.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE e."userId" = $1'),
      expect.arrayContaining(['user-1']),
    );
    expect(dataSource.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM knowledge_relations r'),
      expect.arrayContaining(['user-1']),
    );
  });
});
