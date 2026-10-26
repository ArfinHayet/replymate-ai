import { X } from 'lucide-react';
import type { AdminRow, PageResult, PendingAction, Tab } from '../../types/admin';
import { Pagination } from './Pagination';
import { RecordRow } from './RecordRow';

type RecordsTableProps = {
  tab: Tab;
  title: string;
  adminId: string;
  result: PageResult | null;
  loading: boolean;
  error: string;
  notice: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDismissNotice: () => void;
  onRetry: () => void;
  onViewContent: (row: AdminRow) => void;
  onAction: (action: PendingAction) => void;
};

export function RecordsTable({ tab, title, adminId, result, loading, error, notice, page, pageSize, onPageChange, onPageSizeChange, onDismissNotice, onRetry, onViewContent, onAction }: RecordsTableProps) {
  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const columns = tab === 'contacts'
    ? ['Sender', 'Subject', 'Message', 'Received']
    : tab === 'users'
      ? ['User', 'Joined', 'Last sign in', 'Status', 'Actions']
      : tab === 'csvs'
        ? ['File', 'User', 'Uploaded', 'Rows', 'Actions']
        : [tab === 'images' ? 'Image' : 'File', 'User', 'Uploaded', 'Actions'];

  return <section className="table-card" aria-label={`${title} table`}>
    <div className="table-top">
      <div><h2>All {title}</h2><p>Showing {start}–{end} of {total.toLocaleString()}</p></div>
      <label className="page-size">Rows per page<select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
    </div>
    {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={onDismissNotice}><X size={14} /></button></div>}
    {error && <div className="error-message table-error" role="alert">{error}<button className="text-button" onClick={onRetry}>Retry</button></div>}
    <div className="table-scroll"><table aria-busy={loading}>
      <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>
        {loading ? Array.from({ length: 5 }, (_, index) => <tr key={index} className="skeleton-row"><td colSpan={columns.length}><div /></td></tr>)
          : result?.items.length ? result.items.map((row) => <RecordRow key={row.id} tab={tab} row={row} adminId={adminId} onViewContent={onViewContent} onAction={onAction} />)
            : <tr><td className="empty-table" colSpan={columns.length}>No records match these filters.</td></tr>}
      </tbody>
    </table></div>
    <Pagination page={page} pages={pages} loading={loading} onPageChange={onPageChange} />
  </section>;
}
