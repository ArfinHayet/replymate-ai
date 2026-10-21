import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { ContactMessagesService } from './contact-messages.service';
import type { TurnstileService } from '../../core/turnstile/turnstile.service';

describe('ContactMessagesService', () => {
  const query = jest.fn();
  const verify = jest.fn();
  const service = new ContactMessagesService({ query } as unknown as DataSource,
    { verify } as unknown as TurnstileService);
  const valid = { name: 'Alex Morgan', email: 'alex@example.com', message: 'Please help with embedding.', turnstileToken: 'token' };

  beforeEach(() => { query.mockReset(); verify.mockReset().mockResolvedValue(undefined); });

  it('saves trimmed fields and returns only the persisted receipt', async () => {
    const receipt = { id: 'saved-id', createdAt: new Date('2026-10-14T00:00:00Z') };
    query.mockResolvedValue([receipt]);
    await expect(service.create({
      name: ' Alex Morgan ', email: ' alex@example.com ', subject: ' Website support ',
      message: ' Hello\nPlease help. ',
      turnstileToken: ' token ',
    })).resolves.toEqual(receipt);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('RETURNING id, "createdAt"'),
      ['Alex Morgan', 'alex@example.com', 'Website support', 'Hello\nPlease help.']);
    expect(verify).toHaveBeenCalledWith('token', 'contact');
    expect(verify.mock.invocationCallOrder[0]).toBeLessThan(query.mock.invocationCallOrder[0]);
  });

  it.each([undefined, '', '   '])('stores an absent/blank subject as null (%s)', async (subject) => {
    query.mockResolvedValue([{ id: 'saved-id', createdAt: new Date() }]);
    await service.create({ ...valid, subject });
    expect(query.mock.calls[0][1]).toEqual([valid.name, valid.email, null, valid.message]);
  });

  it.each([
    null,
    {},
    { ...valid, name: '   ' },
    { ...valid, email: 'invalid-email' },
    { ...valid, message: '   ' },
    { ...valid, name: 'a'.repeat(121) },
    { ...valid, email: `${'a'.repeat(245)}@example.com` },
    { ...valid, subject: 's'.repeat(201) },
    { ...valid, message: 'm'.repeat(5001) },
    { ...valid, message: 123 },
    { ...valid, extra: 'unknown field' },
    { ...valid, turnstileToken: undefined },
    { ...valid, turnstileToken: {} },
    { ...valid, turnstileToken: ' ' },
    { ...valid, turnstileToken: 'x'.repeat(2049) },
  ])('rejects invalid input without writing: %j', async (input) => {
    await expect(service.create(input)).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it('accepts fields at the allowed lengths', async () => {
    query.mockResolvedValue([{ id: 'saved-id', createdAt: new Date() }]);
    await service.create({ ...valid, name: 'n'.repeat(120), subject: 's'.repeat(200), message: 'm'.repeat(5000) });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not return a receipt when persistence fails', async () => {
    query.mockRejectedValue(new Error('Database unavailable'));
    await expect(service.create(valid)).rejects.toThrow('Database unavailable');
  });

  it.each([new BadRequestException('Verification failed'), new ServiceUnavailableException('Unavailable')])(
    'does not save or issue a receipt when verification fails: %j', async (error) => {
      verify.mockRejectedValue(error);
      await expect(service.create(valid)).rejects.toBe(error);
      expect(query).not.toHaveBeenCalled();
    },
  );
});
