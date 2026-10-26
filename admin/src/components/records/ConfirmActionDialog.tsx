import { useEffect, useRef } from 'react';
import { Ban, Trash2 } from 'lucide-react';
import type { PendingAction, Tab } from '../../types/admin';

type ConfirmActionDialogProps = {
  tab: Tab;
  action: PendingAction;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmActionDialog({ tab, action, busy, onCancel, onConfirm }: ConfirmActionDialogProps) {
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    cancelButton.current?.focus();
    return () => { if (previousFocus instanceof HTMLElement) previousFocus.focus(); };
  }, []);

  return <div className="dialog-backdrop" role="presentation">
    <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" onKeyDown={(event) => {
      if (event.key === 'Escape' && !busy) onCancel();
      if (event.key === 'Tab') {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const next = event.shiftKey ? buttons.at(-1) : buttons[0];
        const boundary = event.shiftKey ? buttons[0] : buttons.at(-1);
        if (document.activeElement === boundary) { event.preventDefault(); next?.focus(); }
      }
    }}>
      <div className="dialog-icon">{action.kind === 'delete' ? <Trash2 size={22} /> : <Ban size={22} />}</div>
      <h2 id="dialog-title">{action.kind === 'delete' ? `Delete ${tab.slice(0, -1).toUpperCase()}?` : `${action.blocked ? 'Block' : 'Unblock'} user?`}</h2>
      <p id="dialog-description">{action.kind === 'delete' ? `This will permanently remove ${action.row.title || action.row.fileName || 'this record'} and its indexed content.` : `${action.row.email || action.row.id} will ${action.blocked ? 'lose access to the app and widget' : 'regain access'}.`}</p>
      <div className="dialog-actions">
        <button ref={cancelButton} className="button ghost" disabled={busy} onClick={onCancel}>Cancel</button>
        <button className="button destructive" disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : action.kind === 'delete' ? 'Delete content' : action.blocked ? 'Block user' : 'Unblock user'}</button>
      </div>
    </div>
  </div>;
}
