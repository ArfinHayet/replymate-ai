import type { FormEvent } from 'react';
import { Search } from 'lucide-react';
import type { Filters, Tab } from '../../types/admin';

type RecordFiltersProps = {
  tab: Tab;
  draft: Filters;
  onChange: (filters: Filters) => void;
  onApply: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
};

export function RecordFilters({ tab, draft, onChange, onApply, onClear }: RecordFiltersProps) {
  return <form className="filter-card" onSubmit={onApply}>
    <div className="filter-heading"><Search size={16} /><strong>Filters</strong></div>
    <div className="filter-grid">
      {tab === 'users' || tab === 'contacts'
        ? <label>{tab === 'contacts' ? 'Find message' : 'Find user'}<input type="search" placeholder={tab === 'contacts' ? 'Name, email, subject, or message' : 'Email or user ID'} value={draft.search} onChange={(event) => onChange({ ...draft, search: event.target.value })} /></label>
        : <label>User<input type="search" placeholder="Email or user ID" value={draft.userId} onChange={(event) => onChange({ ...draft, userId: event.target.value })} /></label>}
      <label>From<input type="date" value={draft.from} onChange={(event) => onChange({ ...draft, from: event.target.value })} /></label>
      <label>To<input type="date" value={draft.to} onChange={(event) => onChange({ ...draft, to: event.target.value })} /></label>
      <div className="filter-buttons"><button className="button primary" type="submit">Apply</button><button className="button ghost" type="button" onClick={onClear}>Clear</button></div>
    </div>
  </form>;
}
