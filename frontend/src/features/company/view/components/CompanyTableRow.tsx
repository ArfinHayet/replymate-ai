import { Calendar, Pencil, Trash2 } from "lucide-react";
import type { Company } from "../../model/entities/Company";
import { formatCompanyDate } from "../../model/services/companyFormatters";

interface CompanyTableRowProps {
  company: Company;
  index: number;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
}

export function CompanyTableRow({ company, index, onEdit, onDelete }: CompanyTableRowProps) {
  const isActive = index === 0;

  return (
    <div
      className={`grid grid-cols-[2fr_3fr_2fr_80px] px-6 py-4 items-center border-b border-gray-50 last:border-0 transition-colors duration-100 group cursor-default ${
        isActive ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-blue-50/20"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`h-9 w-9 rounded-rm-trip-smooth flex items-center justify-center shrink-0 font-bold text-sm ${
            isActive ? "bg-rm-trip-brand text-white" : "bg-gray-100 text-rm-trip-text-muted"
          }`}
        >
          {company.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex items-center gap-2">
          <p className="font-semibold text-rm-trip-text text-sm truncate leading-tight">{company.name}</p>
          {isActive && (
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-white bg-rm-trip-state-success px-2 py-0.5 rounded-rm-trip-pill">
              Active
            </span>
          )}
        </div>
      </div>

      <p className="text-rm-trip-text-muted text-sm truncate pr-6">{company.shortDescription}</p>

      <div className="flex items-center gap-1.5 text-rm-trip-text-muted text-sm">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-300" />
        <span>{formatCompanyDate(company.updatedAt)}</span>
      </div>

      <div className="flex justify-end gap-1">
        <button
          onClick={() => onEdit(company)}
          className="h-8 w-8 flex items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:text-rm-trip-brand hover:bg-blue-100 border border-transparent hover:border-blue-200 transition-all duration-150"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(company)}
          className="h-8 w-8 flex items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:text-rm-trip-state-error hover:bg-red-50 border border-transparent hover:border-red-200 transition-all duration-150"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
