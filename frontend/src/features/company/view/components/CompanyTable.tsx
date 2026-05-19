import type { Company } from "../../model/entities/Company";
import { CompanyEmptyState } from "./CompanyEmptyState";
import { CompanyTableLoadingRows } from "./CompanyTableLoadingRows";
import { CompanyTableRow } from "./CompanyTableRow";

interface CompanyTableProps {
  companies: Company[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
}

export function CompanyTable({ companies, loading, onCreate, onEdit, onDelete }: CompanyTableProps) {
  return (
    <div className="bg-white rounded-rm-trip-smooth border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-[2fr_3fr_2fr_80px] px-6 py-3.5 bg-gray-50/80 border-b border-gray-100">
        {["Company Name", "Short Description", "Last Updated", "Actions"].map((heading, index) => (
          <p
            key={heading}
            className={`text-xs font-semibold text-rm-trip-text-muted ${index === 3 ? "text-right" : ""}`}
          >
            {heading}
          </p>
        ))}
      </div>

      {loading && <CompanyTableLoadingRows />}
      {!loading && companies.length === 0 && <CompanyEmptyState onCreate={onCreate} />}
      {!loading &&
        companies.map((company, index) => (
          <CompanyTableRow
            key={company.id}
            company={company}
            index={index}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}
