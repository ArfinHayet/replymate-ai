import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { BadRequestException, Module, ServiceUnavailableException, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AdminController } from '../admin/admin.controller';
import { AdminService } from '../admin/admin.service';
import { AdminGuard } from '../admin/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentService } from '../document/document.service';
import { CsvService } from '../document/csv.service';
import { ImageService } from '../image/image.service';
import { ContactMessagesModule } from './contact-messages.module';
import { TurnstileService } from '../../core/turnstile/turnstile.service';

jest.mock('../document/document.service', () => ({ DocumentService: class {} }));
jest.mock('../document/csv.service', () => ({ CsvService: class {} }));
jest.mock('../image/image.service', () => ({ ImageService: class {} }));
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: async (token: string) => ({
    data: { user: token === 'invalid' ? null : { id: 'test-user', email: token === 'admin' ? 'admin@example.com' : 'user@example.com' } },
    error: token === 'invalid' ? new Error('Invalid token') : null,
  }) } }),
}));

describe('Contact message HTTP endpoints', () => {
  let app: INestApplication;
  const query = jest.fn();
  const verify = jest.fn();
  const payload = { name: ' Alex ', email: ' alex@example.com ', message: ' Please help. ', turnstileToken: 'token' };
  let consoleLog: jest.SpyInstance;

  beforeAll(async () => {
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    @Module({})
    class TestDatabaseModule {}
    const module = await Test.createTestingModule({
      imports: [ContactMessagesModule, {
        global: true, module: TestDatabaseModule,
        providers: [{ provide: DataSource, useValue: { query } }], exports: [DataSource],
      }],
      controllers: [AdminController],
      providers: [AdminService, AdminGuard, JwtAuthGuard,
        { provide: ConfigService, useValue: new ConfigService({ supabase: {
          url: 'https://example.supabase.co', anonKey: 'test-key', serviceRoleKey: 'test-key', adminEmails: 'admin@example.com',
        } }) },
        { provide: DocumentService, useValue: {} },
        { provide: CsvService, useValue: {} },
        { provide: ImageService, useValue: {} },
      ],
    }).overrideProvider(TurnstileService).useValue({ verify }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
  });

  beforeEach(() => { query.mockReset(); verify.mockReset().mockResolvedValue(undefined); });
  afterAll(async () => { await app?.close(); consoleLog?.mockRestore(); });

  it('allows anonymous POST and returns a 201 receipt after saving', async () => {
    const createdAt = new Date('2026-10-14T00:00:00Z');
    query.mockResolvedValue([{ id: 'contact-id', createdAt }]);
    const response = await request(app.getHttpServer()).post('/contact-messages').send(payload).expect(201);
    expect(response.body).toEqual({ id: 'contact-id', createdAt: createdAt.toISOString() });
    expect(query.mock.calls[0][1]).toEqual(['Alex', 'alex@example.com', null, 'Please help.']);
  });

  it('returns 400 for invalid submission without saving', async () => {
    await request(app.getHttpServer()).post('/contact-messages').send({ ...payload, email: 'bad' }).expect(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects missing human verification without saving', async () => {
    await request(app.getHttpServer()).post('/contact-messages')
      .send({ ...payload, turnstileToken: undefined }).expect(400);
    expect(verify).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it.each([new BadRequestException('Verification failed'), new ServiceUnavailableException('Unavailable')])(
    'returns verification errors without saving or issuing a receipt: %j', async (error) => {
      verify.mockRejectedValue(error);
      const response = await request(app.getHttpServer()).post('/contact-messages').send(payload).expect(error.getStatus());
      expect(response.body).not.toHaveProperty('id');
      expect(query).not.toHaveBeenCalled();
    },
  );

  it('returns 500 rather than a success receipt when saving fails', async () => {
    query.mockRejectedValue(new Error('Database unavailable'));
    const response = await request(app.getHttpServer()).post('/contact-messages').send(payload).expect(500);
    expect(response.body).not.toHaveProperty('id');
  });

  it('does not expose a public GET list', async () => {
    await request(app.getHttpServer()).get('/contact-messages').expect(404);
    expect(query).not.toHaveBeenCalled();
  });

  it('requires authentication for admin listing', async () => {
    await request(app.getHttpServer()).get('/admin/contact-messages').expect(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects invalid authentication and authenticated non-admins', async () => {
    await request(app.getHttpServer()).get('/admin/contact-messages').auth('invalid', { type: 'bearer' }).expect(401);
    await request(app.getHttpServer()).get('/admin/contact-messages').auth('regular', { type: 'bearer' }).expect(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('allows admins to retrieve paginated messages', async () => {
    const items = [{ id: 'contact-id', name: 'Alex', email: 'alex@example.com', subject: null, message: 'Please help.', createdAt: '2026-10-14T00:00:00.000Z' }];
    query.mockResolvedValueOnce([{ total: 21 }]).mockResolvedValueOnce(items);
    const response = await request(app.getHttpServer()).get('/admin/contact-messages?page=2&pageSize=20')
      .auth('admin', { type: 'bearer' }).expect(200);
    expect(response.body).toEqual({ items, total: 21, page: 2, pageSize: 20 });
  });
});
