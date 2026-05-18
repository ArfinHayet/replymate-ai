import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { InlineError } from "@/components/ui/InlineError";
import { useCompanyViewModel } from "../../viewModel/useCompanyViewModel";
import { CompanyDeleteDialog } from "../components/CompanyDeleteDialog";
import { CompanyFormDialog } from "../components/CompanyFormDialog";
import { CompanyStats } from "../components/CompanyStats";
import { CompanyTable } from "../components/CompanyTable";

export function CompanyPage() {
  const viewModel = useCompanyViewModel();

  const refreshCompanies = async () => {
    const result = await viewModel.loadCompanies();
    if (result.errorMessage) {
      toast.error(result.errorMessage);
    }
  };

  const saveCompany = async () => {
    const result = await viewModel.saveCompany();
    if (result.message) toast.success(result.message);
    if (result.errorMessage) toast.error(result.errorMessage);
  };

  const deleteCompany = async () => {
    const result = await viewModel.deleteCompany();
    if (result.message) toast.success(result.message);
    if (result.errorMessage) toast.error(result.errorMessage);
  };

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader
        title="Company Profile"
        subtitle={
          <>
            The <span className="font-semibold text-rm-trip-state-success">Active</span> company is injected into the chatbot's system prompt on every request.
          </>
        }
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => void refreshCompanies()}
            disabled={viewModel.loading}
            className="flex items-center gap-2 border border-gray-200 bg-white text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${viewModel.loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={viewModel.openCreate}
            className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-bold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-glow transition-all duration-150 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </button>
        </div>
      </PageHeader>

      <div className="mx-auto px-8 py-8 space-y-6">
        {viewModel.error && !viewModel.loading && (
          <InlineError
            title="Could not load company profile"
            message="Your company details are unavailable right now. Retry before editing assistant behavior."
            onRetry={() => void refreshCompanies()}
            retrying={viewModel.loading}
          />
        )}
        <CompanyStats companies={viewModel.companies} loading={viewModel.loading} />
        <CompanyTable
          companies={viewModel.companies}
          loading={viewModel.loading}
          onCreate={viewModel.openCreate}
          onEdit={viewModel.openEdit}
          onDelete={viewModel.requestDelete}
        />
      </div>

      <CompanyFormDialog
        open={viewModel.formOpen}
        editTarget={viewModel.editTarget}
        form={viewModel.form}
        saving={viewModel.saving}
        canSave={viewModel.canSave}
        onClose={viewModel.closeForm}
        onNameChange={viewModel.setFormName}
        onShortDescriptionChange={viewModel.setFormShortDescription}
        onSave={() => void saveCompany()}
      />

      <CompanyDeleteDialog
        deleteTarget={viewModel.deleteTarget}
        deleting={viewModel.deleting}
        onCancel={viewModel.cancelDelete}
        onDelete={() => void deleteCompany()}
      />
    </div>
  );
}
