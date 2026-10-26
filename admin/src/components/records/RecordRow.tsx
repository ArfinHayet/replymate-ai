import { Ban, Trash2 } from 'lucide-react';
import type { AdminRow, PendingAction, Tab } from '../../types/admin';
import { readableDate } from '../../utils/admin';

type RecordRowProps = {
  tab: Tab;
  row: AdminRow;
  adminId: string;
  onViewContent: (row: AdminRow) => void;
  onAction: (action: PendingAction) => void;
};

export function RecordRow({ tab, row, adminId, onViewContent, onAction }: RecordRowProps) {
  if (tab === 'contacts') return <tr>
    <td className="contact-cell"><div className="main-cell">{row.name}</div><div className="sub-cell">{row.email}</div></td>
    <td className="contact-cell">{row.subject || 'No subject'}</td>
    <td className="contact-message"><details><summary>View message</summary><p>{row.message}</p></details></td>
    <td>{readableDate(row.createdAt)}</td>
  </tr>;

  if (tab === 'users') return <tr>
    <td><div className="main-cell">{row.email || 'No email'}</div><div className="sub-cell">{row.id}</div></td>
    <td>{readableDate(row.createdAt)}</td><td>{readableDate(row.lastSignInAt)}</td>
    <td><span className={`status ${row.blocked ? 'blocked' : 'active'}`}>{row.blocked ? 'Blocked' : 'Active'}</span></td>
    <td className="actions">
      <button className="table-action" onClick={() => onViewContent(row)}>View content</button>
      <button className={`table-action ${row.blocked ? '' : 'danger'}`} disabled={row.id === adminId && !row.blocked} onClick={() => onAction({ kind: 'block', row, blocked: !row.blocked })}><Ban size={14} />{row.blocked ? 'Unblock' : 'Block'}</button>
    </td>
  </tr>;

  return <tr>
    <td><div className="main-cell">{row.title || row.fileName || 'Untitled'}</div><div className="sub-cell">{row.id}</div>{tab === 'images' && row.storageUrl && <a className="image-link" href={row.storageUrl} target="_blank" rel="noreferrer">View image</a>}</td>
    <td><div className="main-cell">{row.userEmail || row.userId || 'Unknown user'}</div><div className="sub-cell">{row.userEmail ? row.userId : row.userId ? 'No matching Auth account' : 'Legacy record'}</div></td>
    <td>{readableDate(row.createdAt)}</td>
    {tab === 'csvs' && <td>{row.rowCount?.toLocaleString() ?? '—'}</td>}
    <td className="actions"><button className="table-action danger" onClick={() => onAction({ kind: 'delete', row })}><Trash2 size={14} />Delete</button></td>
  </tr>;
}
