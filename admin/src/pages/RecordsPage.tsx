import { useState } from 'react';
import { useNavigate } from 'react-router';
import { apiRequest } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { ConfirmActionDialog } from '../components/records/ConfirmActionDialog';
import { RecordFilters } from '../components/records/RecordFilters';
import { RecordsTable } from '../components/records/RecordsTable';
import { navigation } from '../config/navigation';
import { useRecordFilters } from '../hooks/useRecordFilters';
import { useRecords } from '../hooks/useRecords';
import type { AdminRow, PendingAction, Tab } from '../types/admin';

export function RecordsPage({ tab }: { tab: Tab }) {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const { filters, draft, setDraft, page, pageSize, setPage, setPageSize, applyFilters, clearFilters } = useRecordFilters();
  const { result, loading, error, setError, refresh } = useRecords(tab, filters, page, pageSize, setPage);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const title = navigation.find((item) => item.id === tab)?.label ?? 'Users';

  function filterForUser(row: AdminRow) {
    const params = new URLSearchParams({ userId: row.id });
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (pageSize !== 20) params.set('pageSize', String(pageSize));
    navigate(`/pdfs?${params}`);
  }

  async function confirmAction() {
    if (!pending || actionBusy) return;
    setActionBusy(true);
    setError('');
    try {
      if (pending.kind === 'block') {
        await apiRequest(`/admin/users/${pending.row.id}/block`, {
          method: 'PATCH', body: JSON.stringify({ blocked: pending.blocked }),
        });
        setNotice(pending.blocked ? 'User blocked.' : 'User unblocked.');
      } else {
        await apiRequest(`/admin/content/${tab}/${pending.row.id}`, { method: 'DELETE' });
        setNotice('Content deleted.');
      }
      setPending(null);
      if (pending.kind === 'delete' && result?.items.length === 1 && page > 1) setPage(page - 1, true);
      else refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Action failed.');
    } finally {
      setActionBusy(false);
    }
  }

  return <section className="dashboard-content">
    <div className="section-heading">
      <div><span className="eyebrow">MANAGE PLATFORM</span><h1>{title}</h1><p>{tab === 'contacts' ? 'Review messages sent through the landing page contact form.' : `Review ${tab === 'users' ? 'accounts and access' : `${title.toLowerCase()} uploaded by users`} across SupportMate.`}</p></div>
      <div className="count-card"><span>Total matching</span><strong>{loading && !result ? '—' : (result?.total ?? 0).toLocaleString()}</strong></div>
    </div>
    <RecordFilters tab={tab} draft={draft} onChange={setDraft} onApply={applyFilters} onClear={clearFilters} />
    <RecordsTable tab={tab} title={title} adminId={admin!.id} result={result} loading={loading} error={error} notice={notice} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} onDismissNotice={() => setNotice('')} onRetry={refresh} onViewContent={filterForUser} onAction={setPending} />
    {pending && <ConfirmActionDialog tab={tab} action={pending} busy={actionBusy} onCancel={() => setPending(null)} onConfirm={() => void confirmAction()} />}
  </section>;
}
