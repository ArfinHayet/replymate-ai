import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { CsvService } from '../document/csv.service';
import { DocumentService } from '../document/document.service';
import { ImageService } from '../image/image.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('Admin content deletion side effects', () => {
  const ownerId = 'owner-id';
  const record = { id: 'content-id', userId: ownerId };
  const repository = { findOne: jest.fn(), remove: jest.fn() };
  const dataSource = { query: jest.fn() };
  const profile = { refresh: jest.fn() };
  const llm = { getEmbeddings: jest.fn().mockReturnValue({}) };
  const storageRemove = jest.fn();

  beforeEach(() => {
    repository.findOne.mockReset(); repository.remove.mockReset(); dataSource.query.mockReset(); profile.refresh.mockReset();
    storageRemove.mockReset().mockResolvedValue({ error: null });
    (createClient as jest.Mock).mockReturnValue({ storage: { from: jest.fn().mockReturnValue({ remove: storageRemove }) } });
  });

  it.each(['pdfs', 'csvs'] as const)('deletes %s by ID, clears only the owner cache, and refreshes profile completion', async (type) => {
    repository.findOne.mockResolvedValue(record);
    const service = type === 'pdfs'
      ? new DocumentService({} as never, repository as never, {} as never, dataSource as never, llm as never, {} as never, profile as never)
      : new CsvService({} as never, repository as never, {} as never, dataSource as never, llm as never, profile as never);
    if (service instanceof DocumentService) await service.deletePdfAsAdmin(record.id);
    else await service.deleteCsvAsAdmin(record.id);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: record.id } });
    expect(repository.remove).toHaveBeenCalledWith(record);
    expect(dataSource.query).toHaveBeenCalledWith('DELETE FROM cached_answers WHERE "userId" = $1', [ownerId]);
    expect(profile.refresh).toHaveBeenCalledWith(ownerId);
  });

  it('does not clear caches or refresh profiles when a PDF was not found', async () => {
    repository.findOne.mockResolvedValue(null);
    const service = new DocumentService({} as never, repository as never, {} as never, dataSource as never,
      llm as never, {} as never, profile as never);
    await expect(service.deletePdfAsAdmin('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.remove).not.toHaveBeenCalled();
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(profile.refresh).not.toHaveBeenCalled();
  });

  it('removes a hosted image from storage before deleting the record and returns its owner', async () => {
    const image = { ...record, storageUrl: 'https://example.supabase.co/storage/v1/object/public/images/owner-id/photo%20name.png' };
    repository.findOne.mockResolvedValue(image);
    const service = new ImageService(repository as never, new ConfigService({ supabase: {
      url: 'https://example.supabase.co', serviceRoleKey: 'test-key', imagesBucket: 'images',
    } }), {} as never, llm as never);
    await expect(service.removeAsAdmin(record.id)).resolves.toEqual({ userId: ownerId });
    expect(storageRemove).toHaveBeenCalledWith(['owner-id/photo name.png']);
    expect(storageRemove.mock.invocationCallOrder[0]).toBeLessThan(repository.remove.mock.invocationCallOrder[0]);
    expect(repository.remove).toHaveBeenCalledWith(image);
  });

  it('keeps the image record when storage deletion fails', async () => {
    repository.findOne.mockResolvedValue({ ...record, storageUrl: 'https://example.supabase.co/storage/v1/object/public/images/photo.png' });
    storageRemove.mockResolvedValue({ error: { message: 'Storage unavailable' } });
    const service = new ImageService(repository as never, new ConfigService({ supabase: {
      url: 'https://example.supabase.co', serviceRoleKey: 'test-key',
    } }), {} as never, llm as never);
    await expect(service.removeAsAdmin(record.id)).rejects.toThrow('Storage deletion failed');
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
