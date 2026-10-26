import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { Filters, PageResult, Tab } from '../types/admin';
import { queryFor } from '../utils/admin';

export function useRecords(tab: Tab, filters: Filters, page: number, pageSize: number, setPage: (page: number, replace?: boolean) => void) {
  const [result, setResult] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const route = tab === 'users' ? '/admin/users' : tab === 'contacts' ? '/admin/contact-messages' : `/admin/content/${tab}`;
  const query = queryFor(tab, filters, page, pageSize);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setResult(null);
    void apiRequest<PageResult>(`${route}?${query}`)
      .then((data) => {
        if (!active) return;
        const lastPage = Math.max(1, Math.ceil(data.total / pageSize));
        if (page > lastPage) setPage(lastPage, true);
        else setResult(data);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [route, query, page, pageSize, reload, setPage]);

  function refresh() {
    setReload((value) => value + 1);
  }

  return { result, loading, error, setError, refresh };
}
