import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import type { DocumentService } from '../document/document.service';
import type { CsvService } from '../document/csv.service';
import type { ImageService } from '../image/image.service';
import { AdminService, type ListQuery } from './admin.service';

jest.mock('../document/document.service', () => ({ DocumentService: class {} }));
jest.mock('../document/csv.service', () => ({ CsvService: class {} }));
jest.mock('../image/image.service', () => ({ ImageService: class {} }));

describe('Admin contact message listing', () => {
  const query = jest.fn();
  const config = new ConfigService({ supabase: { url: 'https://example.supabase.co', serviceRoleKey: 'test-key' } });
  const service = new AdminService(config, { query } as unknown as DataSource,
    {} as DocumentService, {} as CsvService, {} as ImageService);

  beforeEach(() => query.mockReset());

  it('defaults to page one with 20 rows and deterministic newest-first ordering', async () => {
    const items = [{ id: 'contact-id', name: 'Alex', message: 'Question' }];
    query.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce(items);
    await expect(service.listContactMessages({})).resolves.toEqual({ items, total: 1, page: 1, pageSize: 20 });
    expect(query.mock.calls[1][0]).toContain('ORDER BY c."createdAt" DESC, c.id DESC');
    expect(query.mock.calls[1][1]).toEqual([20, 0]);
  });

  it('uses parameterized search/date filters and the requested page offset', async () => {
    query.mockResolvedValueOnce([{ total: 27 }]).mockResolvedValueOnce([]);
    const search = "Alex' OR 1=1 --";
    await service.listContactMessages({ page: '2', pageSize: '10', search: ` ${search} `,
      from: '2026-10-01', to: '2026-10-14' });
    const [sql, params] = query.mock.calls[1];
    for (const field of ['name', 'email', 'subject', 'message']) expect(sql).toContain(`c.${field} ILIKE $1`);
    expect(sql).toContain('c."createdAt" >= $2');
    expect(sql).toContain('c."createdAt" <= $3');
    expect(sql).toContain('LIMIT $4 OFFSET $5');
    expect(sql).not.toContain(search);
    expect(params).toEqual([`%${search}%`, '2026-10-01T00:00:00.000Z', '2026-10-14T00:00:00.000Z', 10, 10]);
    expect(query.mock.calls[0][1]).toEqual(params.slice(0, 3));
  });

  it('returns an empty page with its total and pagination metadata', async () => {
    query.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
    await expect(service.listContactMessages({ page: '3', pageSize: '50', search: '   ' }))
      .resolves.toEqual({ items: [], total: 0, page: 3, pageSize: 50 });
    expect(query.mock.calls[1][1]).toEqual([50, 100]);
  });

  it.each([
    { page: '0' }, { page: '-1' }, { page: '1.5' }, { page: 'invalid' }, { page: '1000001' },
    { pageSize: '0' }, { pageSize: '101' }, { pageSize: '1.5' },
    { from: 'invalid' }, { to: 'invalid' }, { from: '2026-10-15', to: '2026-10-14' },
    { search: ['a', 'b'] }, { page: ['1'] }, { from: ['2026-10-01'] },
  ])('rejects invalid query values before database access: %j', async (input) => {
    await expect(service.listContactMessages(input as ListQuery)).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });
});
