import { Skeleton } from "@/components/ui/skeleton";
import type { Company } from "../../model/entities/Company";
import { formatCompanyDateOnly, getActiveCompanyName } from "../../model/services/companyFormatters";

interface CompanyStatsProps {
  companies: Company[];
  loading: boolean;
}

export function CompanyStats({ companies, loading }: CompanyStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="min-w-0 bg-white rounded-rm-trip-smooth border border-gray-100 px-5 py-4">
        <p className="text-xs font-semibold text-rm-trip-text-muted mb-2">Total Companies</p>
        <p className="min-w-0 truncate font-rm-trip-heading font-semibold text-xl text-rm-trip-brand">
          {loading ? <Skeleton className="h-7 w-8" /> : companies.length}
        </p>
      </div>
      <div className="min-w-0 bg-white rounded-rm-trip-smooth border border-gray-100 px-5 py-4">
        <p className="text-xs font-semibold text-rm-trip-text-muted mb-2">Active Profile</p>
        <p className="min-w-0 truncate font-rm-trip-heading font-semibold text-base text-rm-trip-state-success">
          {loading ? <Skeleton className="h-6 w-32" /> : getActiveCompanyName(companies)}
        </p>
      </div>
      <div className="min-w-0 bg-white rounded-rm-trip-smooth border border-gray-100 px-5 py-4">
        <p className="text-xs font-semibold text-rm-trip-text-muted mb-2">Last Updated</p>
        <p className="min-w-0 truncate font-rm-trip-heading font-semibold text-base text-rm-trip-text">
          {loading ? (
            <Skeleton className="h-6 w-28" />
          ) : companies[0] ? (
            formatCompanyDateOnly(companies[0].updatedAt)
          ) : (
            "-"
          )}
        </p>
      </div>
    </div>
  );
}
