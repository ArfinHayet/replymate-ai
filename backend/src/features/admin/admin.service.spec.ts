import { BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { AdminService } from './admin.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('../document/document.service', () => ({ DocumentService: class {} }));
jest.mock('../document/csv.service', () => ({ CsvService: class {} }));
jest.mock('../image/image.service', () => ({ ImageService: class {} }));

describe('Admin users and content', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const actorId = '22222222-2222-4222-8222-222222222222';
  const contentId = '33333333-3333-4333-8333-333333333333';
  const account = { id: userId, email: 'alex@example.com', created_at: '2026-10-01T00:00:00Z',
    last_sign_in_at: null, banned_until: null, user_metadata: { private: 'not returned' } };
  const admin = { listUsers: jest.fn(), getUserById: jest.fn(), updateUserById: jest.fn() };
  const query = jest.fn();
  const documents = { deletePdfAsAdmin: jest.fn() };
  const csvs = { deleteCsvAsAdmin: jest.fn() };
  const images = { removeAsAdmin: jest.fn() };
  let service: AdminService;

  beforeEach(() => {
    jest.resetAllMocks();
    (createClient as jest.Mock).mockReturnValue({ auth: { admin } });
    service = new AdminService(new ConfigService({ supabase: {
      url: 'https://example.supabase.co', serviceRoleKey: 'test-service-key',
    } }), { query } as never, documents as never, csvs as never, images as never);
  });

  it('uses paginated Supabase Auth records and exposes only display fields', async () => {
    admin.listUsers.mockResolvedValue({ data: { users: [account], total: 24 }, error: null });
    const result = await service.listUsers({ page: '2', pageSize: '10' });
    expect(admin.listUsers).toHaveBeenCalledWith({ page: 2, perPage: 10 });
    expect(result).toEqual({ items: [{ id: userId, email: account.email, createdAt: account.created_at,
      lastSignInAt: null, bannedUntil: null, blocked: false }], total: 24, page: 2, pageSize: 10 });
    expect(query).not.toHaveBeenCalled();
  });

  it('filters users by email and creation date using the auth provider', async () => {
    admin.listUsers.mockResolvedValue({ data: { users: [account,
      { ...account, id: actorId, email: 'other@example.com' }], total: 2 }, error: null });
    const result = await service.listUsers({ search: ' ALEX ', from: '2026-09-01', to: '2026-11-01' });
    expect(result.items.map((item) => item.id)).toEqual([userId]);
    expect(admin.listUsers).toHaveBeenCalledWith({ page: 1, perPage: 1000 });
  });

  it('reports provider lookup failure without claiming an empty user list', async () => {
    admin.listUsers.mockResolvedValue({ data: null, error: new Error('Unavailable') });
    await expect(service.listUsers({})).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it.each([true, false])('blocks/unblocks through Supabase Auth (%s)', async (blocked) => {
    admin.getUserById.mockResolvedValue({ data: { user: account }, error: null });
    admin.updateUserById.mockResolvedValue({ error: null });
    await expect(service.setBlocked(userId, blocked, actorId)).resolves.toEqual({ id: userId, blocked });
    expect(admin.updateUserById).toHaveBeenCalledWith(userId, { ban_duration: blocked ? '876000h' : 'none' });
  });

  it('rejects self-blocking and malformed IDs before provider writes', async () => {
    await expect(service.setBlocked(actorId, true, actorId)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.setBlocked('bad-id', true, actorId)).rejects.toBeInstanceOf(BadRequestException);
    expect(admin.updateUserById).not.toHaveBeenCalled();
    expect(admin.getUserById).not.toHaveBeenCalled();
  });

  it('does not claim a block succeeded for a missing account', async () => {
    admin.getUserById.mockResolvedValue({ data: { user: null }, error: null });
    await expect(service.setBlocked(userId, true, actorId)).rejects.toBeInstanceOf(NotFoundException);
    expect(admin.updateUserById).not.toHaveBeenCalled();
  });

  it('uses parameterized content filters and decorates content with provider emails', async () => {
    query.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce([
      { id: contentId, userId, fileName: 'example.pdf' },
    ]);
    admin.getUserById.mockResolvedValue({ data: { user: account }, error: null });
    const result = await service.listContent('pdfs', { userId, page: '2', pageSize: '10', from: '2026-10-01' });
    expect(query.mock.calls[1][0]).toContain('c."userId" = $1');
    expect(query.mock.calls[1][0]).toContain('c."createdAt" >= $2');
    expect(query.mock.calls[1][0]).toContain('LIMIT $3 OFFSET $4');
    expect(query.mock.calls[1][1]).toEqual([userId, '2026-10-01T00:00:00.000Z', 10, 10]);
    expect(result.items[0]).toHaveProperty('userEmail', 'alex@example.com');
  });

  it('avoids SQL when an email filter matches no auth users', async () => {
    admin.listUsers.mockResolvedValue({ data: { users: [account], total: 1 }, error: null });
    await expect(service.listContent('images', { userId: 'absent@example.com' }))
      .resolves.toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    expect(query).not.toHaveBeenCalled();
  });

  it.each(['pdfs', 'csvs', 'images'] as const)('delegates %s deletion to its ownership-aware service', async (type) => {
    images.removeAsAdmin.mockResolvedValue({ userId });
    await expect(service.deleteContent(type, contentId)).resolves.toEqual({ deleted: true });
    const deletion = type === 'pdfs' ? documents.deletePdfAsAdmin : type === 'csvs' ? csvs.deleteCsvAsAdmin : images.removeAsAdmin;
    expect(deletion).toHaveBeenCalledWith(contentId);
    if (type === 'images') expect(query).toHaveBeenCalledWith('DELETE FROM cached_answers WHERE "userId" = $1', [userId]);
  });

  it('propagates deletion failure and rejects malformed IDs', async () => {
    documents.deletePdfAsAdmin.mockRejectedValue(new Error('Database unavailable'));
    await expect(service.deleteContent('pdfs', contentId)).rejects.toThrow('Database unavailable');
    await expect(service.deleteContent('pdfs', 'bad-id')).rejects.toBeInstanceOf(BadRequestException);
    expect(documents.deletePdfAsAdmin).toHaveBeenCalledTimes(1);
  });
});
