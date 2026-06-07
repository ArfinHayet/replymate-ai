import { BadRequestException } from '@nestjs/common';
import { ChatToolsService } from './chat-tools.service';

function createService(records: unknown[] = []) {
  const repo = {
    find: jest.fn().mockResolvedValue(records),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      ...value,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })),
  };

  return {
    service: new ChatToolsService(repo as never),
    repo,
  };
}

describe('ChatToolsService', () => {
  it('includes optional flight card selector in default flight search config', async () => {
    const { service } = createService();

    await expect(service.list('user-1')).resolves.toContainEqual(
      expect.objectContaining({
        toolKey: 'flight_search',
        config: expect.objectContaining({
          oneWayTemplateUrl: '',
          roundTripTemplateUrl: '',
          multiCityTemplateUrl: '',
          flightCardSelector: '',
        }),
      }),
    );
  });

  it('persists flight card selector without requiring it when flight search is enabled', async () => {
    const { service, repo } = createService();

    const result = await service.update('user-1', 'flight_search', {
      enabled: true,
      config: {
        oneWayTemplateUrl: 'https://example.com/one-way',
        roundTripTemplateUrl: 'https://example.com/round-trip',
        multiCityTemplateUrl: 'https://example.com/multi-city',
        flightCardSelector: '.flight-card',
      },
    });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          flightCardSelector: '.flight-card',
        }),
      }),
    );
    expect(result.config.flightCardSelector).toBe('.flight-card');
  });

  it('still validates required URLs when flight search is enabled', async () => {
    const { service } = createService();

    await expect(
      service.update('user-1', 'flight_search', {
        enabled: true,
        config: {
          oneWayTemplateUrl: '',
          roundTripTemplateUrl: 'https://example.com/round-trip',
          multiCityTemplateUrl: 'https://example.com/multi-city',
          flightCardSelector: '.flight-card',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
