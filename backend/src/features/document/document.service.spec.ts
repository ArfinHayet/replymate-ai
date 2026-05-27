import { BadRequestException } from '@nestjs/common';
import { DocumentService } from './document.service';

const GOOD_TEXT = Array.from(
  { length: 70 },
  (_, index) => `searchable document word${index}`,
).join(' ');

const AI_TEXT = Array.from(
  { length: 70 },
  (_, index) => `ai extracted word${index}`,
).join(' ');

function createService() {
  const chunkRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(),
  };
  const pdfRepo = {
    create: jest.fn(() => ({ id: 'pdf-1' })),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'rag.chunkSize') return 1000;
      if (key === 'rag.chunkOverlap') return 200;
      return undefined;
    }),
  };
  const dataSource = {
    query: jest.fn(),
  };
  const llmFactory = {
    getEmbeddings: jest.fn(() => ({
      embedDocuments: jest.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2])),
    })),
  };
  const aiService = {
    extractTextFromPdf: jest.fn(),
  };
  const profileCompletionService = {
    refresh: jest.fn(),
  };

  const service = new DocumentService(
    chunkRepo as never,
    pdfRepo as never,
    config as never,
    dataSource as never,
    llmFactory as never,
    aiService as never,
    profileCompletionService as never,
  );

  return { service, aiService };
}

describe('DocumentService PDF AI fallback', () => {
  it('does not call AI extraction for good pdfjs output', async () => {
    const { service, aiService } = createService();
    (service as never as { extractTextFromPdf: jest.Mock }).extractTextFromPdf = jest
      .fn()
      .mockResolvedValue(GOOD_TEXT);

    const text = await (service as never as {
      resolvePdfText(buffer: Buffer, fileName: string): Promise<string>;
    }).resolvePdfText(Buffer.alloc(150 * 1024), 'good.pdf');

    expect(text).toBe(GOOD_TEXT);
    expect(aiService.extractTextFromPdf).not.toHaveBeenCalled();
  });

  it('calls AI extraction for empty pdfjs output', async () => {
    const { service, aiService } = createService();
    (service as never as { extractTextFromPdf: jest.Mock }).extractTextFromPdf = jest
      .fn()
      .mockResolvedValue('');
    aiService.extractTextFromPdf.mockResolvedValue(AI_TEXT);

    const text = await (service as never as {
      resolvePdfText(buffer: Buffer, fileName: string): Promise<string>;
    }).resolvePdfText(Buffer.alloc(150 * 1024), 'scan.pdf');

    expect(text).toBe(AI_TEXT);
    expect(aiService.extractTextFromPdf).toHaveBeenCalledWith(
      expect.any(Buffer),
      'scan.pdf',
    );
  });

  it('calls AI extraction for suspiciously short pdfjs output', async () => {
    const { service, aiService } = createService();
    (service as never as { extractTextFromPdf: jest.Mock }).extractTextFromPdf = jest
      .fn()
      .mockResolvedValue('Invoice total 123');
    aiService.extractTextFromPdf.mockResolvedValue(AI_TEXT);

    const text = await (service as never as {
      resolvePdfText(buffer: Buffer, fileName: string): Promise<string>;
    }).resolvePdfText(Buffer.alloc(150 * 1024), 'short.pdf');

    expect(text).toBe(AI_TEXT);
    expect(aiService.extractTextFromPdf).toHaveBeenCalled();
  });

  it('keeps original pdfjs text when AI extraction is unusable', async () => {
    const { service, aiService } = createService();
    (service as never as { extractTextFromPdf: jest.Mock }).extractTextFromPdf = jest
      .fn()
      .mockResolvedValue('Invoice total 123');
    aiService.extractTextFromPdf.mockResolvedValue('');

    const text = await (service as never as {
      resolvePdfText(buffer: Buffer, fileName: string): Promise<string>;
    }).resolvePdfText(Buffer.alloc(150 * 1024), 'fallback.pdf');

    expect(text).toBe('Invoice total 123');
  });

  it('throws when both extraction paths are empty', async () => {
    const { service, aiService } = createService();
    (service as never as { extractTextFromPdf: jest.Mock }).extractTextFromPdf = jest
      .fn()
      .mockResolvedValue('');
    aiService.extractTextFromPdf.mockResolvedValue('');

    await expect(
      service.ingestPdf(
        {
          buffer: Buffer.alloc(10),
          originalname: 'empty.pdf',
        } as Express.Multer.File,
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
