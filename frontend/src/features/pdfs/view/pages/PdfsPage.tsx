import type { ReactNode } from "react";
import { Calendar, FileText, Files, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/skeleton";
import { usePdfViewModel } from "../../viewModel/usePdfViewModel";

export function PdfsPage() {
  const vm = usePdfViewModel();

  const refresh = async () => {
    const result = await vm.loadPdfs();
    if (result.errorMessage) toast.error(result.errorMessage);
  };

  const rename = async () => {
    const result = await vm.renamePdf();
    if (result.message) toast.success(result.message);
    if (result.errorMessage) toast.error(result.errorMessage);
  };

  const deletePdf = async () => {
    const result = await vm.deletePdf();
    if (result.message) toast.success(result.message);
    if (result.errorMessage) toast.error(result.errorMessage);
  };

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader
        title="Documents"
        subtitle={vm.loading ? "Loading..." : `${vm.pdfs.length} document${vm.pdfs.length !== 1 ? "s" : ""} available to your assistant`}
      >
        <button
          onClick={() => void refresh()}
          disabled={vm.loading}
          className="flex items-center gap-2 rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-rm-trip-text-muted shadow-sm transition-all hover:border-gray-300 hover:text-rm-trip-text disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${vm.loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </PageHeader>

      <PageContent>
        {vm.error && !vm.loading && (
          <InlineError
            title="Could not load documents"
            message="Your uploaded documents are unavailable right now."
            onRetry={() => void refresh()}
            retrying={vm.loading}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total Documents" value={vm.loading ? <Skeleton className="h-7 w-8" /> : vm.pdfs.length} />
          <Stat label="Latest Upload" value={vm.loading ? <Skeleton className="h-6 w-32" /> : vm.pdfs[0]?.fileName ?? "None yet"} />
          <Stat
            label="Last Added"
            value={vm.loading ? <Skeleton className="h-6 w-28" /> : vm.pdfs[0] ? new Date(vm.pdfs[0].createdAt).toLocaleDateString() : "None yet"}
          />
        </div>

        <DataTable
          data={vm.pdfs}
          isLoading={vm.loading}
          getRowKey={(pdf) => pdf.id}
          columns={[
            {
              key: "name",
              label: "File Name",
              render: (pdf, index) => (
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-rm-trip-smooth ${index === 0 ? "bg-rm-trip-brand text-white" : "bg-gray-100 text-rm-trip-text-muted"}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <p className="truncate text-sm font-semibold text-rm-trip-text">{pdf.fileName}</p>
                </div>
              ),
            },
            {
              key: "date",
              label: "Uploaded At",
              render: (pdf) => (
                <div className="flex items-center gap-1.5 text-sm text-rm-trip-text-muted">
                  <Calendar className="h-3.5 w-3.5 text-gray-300" />
                  <span>{new Date(pdf.createdAt).toLocaleString()}</span>
                </div>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (pdf) => (
                <div className="flex gap-1">
                  <button onClick={() => vm.openRename(pdf)} className="flex h-8 w-8 items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:bg-blue-100 hover:text-rm-trip-brand" title="Rename">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => vm.requestDelete(pdf)} className="flex h-8 w-8 items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:bg-red-50 hover:text-rm-trip-state-error" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-rm-trip-smooth bg-gray-100">
                <Files className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="font-rm-trip-heading font-bold text-rm-trip-text">No PDFs uploaded yet</p>
                <p className="mt-1 text-sm text-rm-trip-text-muted">Use the Upload page to add documents</p>
              </div>
            </div>
          }
        />
      </PageContent>

      <Dialog open={!!vm.renameTarget} onOpenChange={(open) => !open && vm.closeRename()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename PDF</DialogTitle>
          </DialogHeader>
          <input
            value={vm.renameValue}
            onChange={(event) => vm.setRenameValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void rename()}
            className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus-rm-trip-highlight"
          />
          <DialogFooter>
            <button onClick={vm.closeRename} className="rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-rm-trip-text-muted">
              Cancel
            </button>
            <button onClick={() => void rename()} disabled={vm.renaming || !vm.renameValue.trim()} className="flex items-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {vm.renaming && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!vm.deleteTarget} onOpenChange={(open) => !open && vm.cancelDelete()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete PDF?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-rm-trip-text-muted">
            This will permanently delete <span className="font-bold text-rm-trip-text">{vm.deleteTarget?.fileName}</span> and its indexed content.
          </p>
          <DialogFooter>
            <button onClick={vm.cancelDelete} className="rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-rm-trip-text-muted">
              Cancel
            </button>
            <button onClick={() => void deletePdf()} disabled={vm.deleting} className="flex items-center gap-2 rounded-rm-trip-smooth bg-rm-trip-state-error px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {vm.deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-rm-trip-smooth border border-gray-100 bg-white px-5 py-4">
      <p className="mb-2 text-xs font-semibold text-rm-trip-text-muted">{label}</p>
      <div className="min-w-0 truncate font-rm-trip-heading text-xl font-semibold text-rm-trip-brand">{value}</div>
    </div>
  );
}
