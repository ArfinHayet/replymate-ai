import type { Filters, Tab } from '../types/admin';

export const emptyFilters: Filters = { search: '', userId: '', from: '', to: '' };

export function readableDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function queryFor(tab: Tab, filters: Filters, page: number, pageSize: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if ((tab === 'users' || tab === 'contacts') && filters.search) params.set('search', filters.search);
  if (tab !== 'users' && tab !== 'contacts' && filters.userId) params.set('userId', filters.userId);
  if (filters.from) params.set('from', new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) params.set('to', new Date(`${filters.to}T23:59:59.999`).toISOString());
  return params.toString();
}
