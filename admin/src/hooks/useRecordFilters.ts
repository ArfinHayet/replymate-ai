import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import type { Filters } from '../types/admin';
import { emptyFilters } from '../utils/admin';

function dateFilter(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}

export function useRecordFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo<Filters>(() => ({
    search: searchParams.get('search') ?? '',
    userId: searchParams.get('userId') ?? '',
    from: dateFilter(searchParams.get('from')),
    to: dateFilter(searchParams.get('to')),
  }), [searchParams]);
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedPageSize = Number(searchParams.get('pageSize') ?? 20);
  const pageSize = [10, 20, 50].includes(requestedPageSize) ? requestedPageSize : 20;
  const [draft, setDraft] = useState<Filters>(filters);

  useEffect(() => { setDraft(filters); }, [filters]);

  const setPage = useCallback((nextPage: number, replace = false) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage === 1) next.delete('page');
      else next.set('page', String(nextPage));
      return next;
    }, { replace });
  }, [setSearchParams]);

  function setPageSize(nextSize: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('pageSize', String(nextSize));
      next.delete('page');
      return next;
    });
  }

  function updateFilters(nextFilters: Filters) {
    const next = new URLSearchParams();
    if (pageSize !== 20) next.set('pageSize', String(pageSize));
    for (const [key, value] of Object.entries(nextFilters)) {
      if (value) next.set(key, value);
    }
    setDraft(nextFilters);
    setSearchParams(next);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilters({ ...draft, search: draft.search.trim(), userId: draft.userId.trim() });
  }

  function clearFilters() {
    updateFilters(emptyFilters);
  }

  return { filters, draft, setDraft, page, pageSize, setPage, setPageSize, applyFilters, clearFilters };
}
