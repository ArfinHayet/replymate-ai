import { Building2, Plus } from "lucide-react";

interface CompanyEmptyStateProps {
  onCreate: () => void;
}

export function CompanyEmptyState({ onCreate }: CompanyEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="h-16 w-16 rounded-rm-trip-smooth bg-gray-100 flex items-center justify-center">
        <Building2 className="h-8 w-8 text-gray-300" />
      </div>
      <div className="text-center">
        <p className="font-rm-trip-heading font-bold text-rm-trip-text">No company profile yet</p>
        <p className="text-rm-trip-text-muted text-sm mt-1">Add one to give the chatbot a company identity</p>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-rm-trip-on-brand font-bold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-glow text-sm transition-all duration-150"
      >
        <Plus className="h-4 w-4" /> Add Company
      </button>
    </div>
  );
}
