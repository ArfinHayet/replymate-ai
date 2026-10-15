import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type User } from '@supabase/supabase-js';
import { DataSource } from 'typeorm';
import { DocumentService } from '../document/document.service';
import { CsvService } from '../document/csv.service';
import { ImageService } from '../image/image.service';

type ContentType = 'pdfs' | 'csvs' | 'images';
export type ListQuery = {
  page?: string;
  pageSize?: string;
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AdminService {
  private readonly supabase: ReturnType<typeof createClient>;

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly documents: DocumentService,
    private readonly csvs: CsvService,
    private readonly images: ImageService,
  ) {
    this.supabase = createClient(
      config.getOrThrow<string>('supabase.url'),
      config.getOrThrow<string>('supabase.serviceRoleKey'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  private pagination(query: ListQuery) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    if (!Number.isInteger(page) || page < 1 || page > 1000000 ||
        !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('Invalid pagination');
    }
    return { page, pageSize, offset: (page - 1) * pageSize };
  }

  private dateFilters(query: ListQuery, column: string, params: unknown[], conditions: string[]) {
    for (const [name, operator] of [['from', '>='], ['to', '<=']] as const) {
      const value = query[name];
      if (!value) continue;
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) throw new BadRequestException(`Invalid ${name} date`);
      params.push(date.toISOString());
      conditions.push(`${column} ${operator} $${params.length}`);
    }
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('Start date must be before end date');
    }
  }

  private userDateBounds(query: ListQuery) {
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;
    if ((from && !Number.isFinite(from.getTime())) || (to && !Number.isFinite(to.getTime()))) {
      throw new BadRequestException('Invalid date filter');
    }
    if (from && to && from > to) throw new BadRequestException('Start date must be before end date');
    return { from, to };
  }

  private async allAuthUsers(): Promise<User[]> {
    const perPage = 1000;
    const users: User[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await this.supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw new InternalServerErrorException('Could not load Supabase users');
      users.push(...data.users);
      if (data.users.length < perPage || (data.total != null && users.length >= data.total)) break;
    }
    return users;
  }

  private displayUser(user: User) {
    return {
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      bannedUntil: user.banned_until ?? null,
      blocked: Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now()),
    };
  }

  async listUsers(query: ListQuery) {
    const { page, pageSize, offset } = this.pagination(query);
    const { from, to } = this.userDateBounds(query);
    const search = query.search?.trim().toLowerCase();

    // Supabase Auth is the source of truth here. The content database may be a
    // separate Supabase project, so its auth.users table cannot list app users.
    if (!search && !from && !to) {
      const { data, error } = await this.supabase.auth.admin.listUsers({ page, perPage: pageSize });
      if (error) throw new InternalServerErrorException('Could not load Supabase users');
      return { items: data.users.map((user) => this.displayUser(user)), total: data.total ?? data.users.length, page, pageSize };
    }

    const users = (await this.allAuthUsers())
      .filter((user) => !search || user.email?.toLowerCase().includes(search) || user.id.toLowerCase().includes(search))
      .filter((user) => {
        const created = new Date(user.created_at);
        return (!from || created >= from) && (!to || created <= to);
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    return { items: users.slice(offset, offset + pageSize).map((user) => this.displayUser(user)), total: users.length, page, pageSize };
  }

  async listContactMessages(query: ListQuery) {
    // HTTP query values can be arrays or objects; reject them before parsing.
    for (const key of ['page', 'pageSize', 'search', 'from', 'to'] as const) {
      if (query[key] !== undefined && typeof query[key] !== 'string') {
        throw new BadRequestException(`Invalid ${key}`);
      }
    }
    const { page, pageSize, offset } = this.pagination(query);
    const params: unknown[] = [];
    const conditions: string[] = [];
    const search = query.search?.trim();
    if (search) {
      params.push(`%${search}%`);
      const parameter = `$${params.length}`;
      conditions.push(`(
        c.name ILIKE ${parameter}
        OR c.email ILIKE ${parameter}
        OR c.subject ILIKE ${parameter}
        OR c.message ILIKE ${parameter}
      )`);
    }
    this.dateFilters(query, 'c."createdAt"', params, conditions);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [count] = await this.dataSource.query(
      `SELECT count(*)::int AS total
       FROM public.contact_messages c ${where}`,
      params,
    ) as Array<{ total: number }>;
    const items = await this.dataSource.query(
      `SELECT c.id, c.name, c.email, c.subject, c.message, c."createdAt"
       FROM public.contact_messages c ${where}
       ORDER BY c."createdAt" DESC, c.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset],
    );
    return { items, total: count.total, page, pageSize };
  }

  async listContent(type: ContentType, query: ListQuery) {
    const { page, pageSize, offset } = this.pagination(query);
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (query.userId?.trim()) {
      const user = query.userId.trim();
      if (UUID.test(user)) {
        params.push(user);
        conditions.push(`c."userId" = $${params.length}`);
      } else {
        const matchingIds = (await this.allAuthUsers())
          .filter((account) => account.email?.toLowerCase().includes(user.toLowerCase()))
          .map((account) => account.id);
        if (!matchingIds.length) return { items: [], total: 0, page, pageSize };
        params.push(matchingIds);
        conditions.push(`c."userId" = ANY($${params.length}::uuid[])`);
      }
    }
    this.dateFilters(query, 'c."createdAt"', params, conditions);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const columns = type === 'images'
      ? 'c.id, c."userId", c."createdAt", c.title, c.description, c."storageUrl"'
      : type === 'csvs'
        ? 'c.id, c."userId", c."createdAt", c."fileName", c."rowCount"'
        : 'c.id, c."userId", c."createdAt", c."fileName"';
    const [count] = await this.dataSource.query(
      `SELECT count(*)::int AS total FROM ${type} c ${where}`, params,
    ) as Array<{ total: number }>;
    const rows = await this.dataSource.query(
      `SELECT ${columns} FROM ${type} c ${where}
       ORDER BY c."createdAt" DESC, c.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset],
    ) as Array<Record<string, unknown> & { userId?: string }>;
    const uniqueIds = [...new Set(rows.map((row) => row.userId).filter((id): id is string => Boolean(id)))];
    const emails = new Map<string, string>();
    for (let start = 0; start < uniqueIds.length; start += 10) {
      const batch = await Promise.all(uniqueIds.slice(start, start + 10).map(async (id) => {
        const { data, error } = await this.supabase.auth.admin.getUserById(id);
        return { id, email: error ? null : data.user?.email ?? null };
      }));
      batch.forEach(({ id, email }) => { if (email) emails.set(id, email); });
    }
    const items = rows.map((row) => ({ ...row, userEmail: row.userId ? emails.get(row.userId) ?? null : null }));
    return { items, total: count.total, page, pageSize };
  }

  async setBlocked(userId: string, blocked: boolean, actorId: string) {
    if (!UUID.test(userId)) throw new BadRequestException('Invalid user ID');
    if (blocked && userId === actorId) throw new ForbiddenException('You cannot block your own account');
    const { data: existing, error: lookupError } = await this.supabase.auth.admin.getUserById(userId);
    if (lookupError || !existing.user) throw new NotFoundException('User not found');
    const { error } = await this.supabase.auth.admin.updateUserById(userId, {
      ban_duration: blocked ? '876000h' : 'none',
    });
    if (error) throw new InternalServerErrorException(error.message);
    return { id: userId, blocked };
  }

  async deleteContent(type: ContentType, id: string) {
    if (!UUID.test(id)) throw new BadRequestException('Invalid content ID');
    switch (type) {
      case 'pdfs': await this.documents.deletePdfAsAdmin(id); break;
      case 'csvs': await this.csvs.deleteCsvAsAdmin(id); break;
      case 'images': {
        const removed = await this.images.removeAsAdmin(id);
        if (removed.userId) {
          await this.dataSource.query('DELETE FROM cached_answers WHERE "userId" = $1', [removed.userId]);
        }
        break;
      }
    }
    return { deleted: true };
  }
}
