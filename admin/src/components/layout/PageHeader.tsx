import { LayoutDashboard, ShieldCheck } from 'lucide-react';

export function PageHeader({ title }: { title: string }) {
  return <header className="page-header">
    <div className="breadcrumb"><LayoutDashboard size={15} /> ADMIN / {title.toUpperCase()}</div>
    <div className="header-badge"><ShieldCheck size={16} /> Secure admin area</div>
  </header>;
}
