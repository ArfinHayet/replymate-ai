import type { ReactNode } from "react";
import { Calendar, ExternalLink, Globe, Loader2, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebPagesViewModel } from "../../viewModel/useWebPagesViewModel";

export function WebPagesPage() {
  const vm = useWebPagesViewModel();

  const refresh = async () => showResult(await vm.loadPages());
  const remove = async () => showResult(await vm.deletePage());

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader
        title="Web Pages"
        subtitle={vm.loading ? "Loading..." : `${vm.pages.length} site${vm.pages.length !== 1 ? "s" : ""} available to your assistant`}
      >
        <button onClick={() => void refresh()} disabled={vm.loading} className="flex items-center gap-2 rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-rm-trip-text-muted shadow-sm disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${vm.loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </PageHeader>

      <PageContent>
        {vm.error && !vm.loading && (
          <InlineError
            title="Could not load web pages"
            message="Your saved web pages are unavailable right now."
            onRetry={() => void refresh()}
            retrying={vm.loading}
          />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Sites" value={vm.loading ? <Skeleton className="h-7 w-8" /> : vm.pages.length} />
          <Stat label="Content Sections" value={vm.loading ? <Skeleton className="h-7 w-12" /> : vm.pages.reduce((sum, page) => sum + page.chunksCreated, 0)} />
          <Stat label="Crawled Pages" value={vm.loading ? <Skeleton className="h-7 w-12" /> : vm.pages.reduce((sum, page) => sum + (page.pagesFetched ?? 1), 0)} />
          <Stat label="Last Added" value={vm.loading ? <Skeleton className="h-6 w-28" /> : vm.pages[0] ? new Date(vm.pages[0].createdAt).toLocaleDateString() : "None yet"} />
        </div>

        <DataTable
          data={vm.pages}
          isLoading={vm.loading}
          getRowKey={(page) => page.id}
          columns={[
            {
              key: "page",
              label: "Page",
              className: "w-[46%]",
              render: (page, index) => (
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-rm-trip-smooth ${index === 0 ? "bg-rm-trip-brand text-white" : "bg-gray-100 text-rm-trip-text-muted"}`}>
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-rm-trip-text">{page.title || page.url}</p>
                    <a href={page.url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="flex max-w-xs items-center gap-1 truncate text-xs text-rm-trip-brand hover:underline">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {page.url}
                    </a>
                  </div>
                </div>
              ),
            },
            {
              key: "chunks",
              label: "Indexed",
              className: "w-[19%]",
              render: (page) => (
                <div className="flex flex-col items-start gap-1">
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-rm-trip-brand">{page.chunksCreated} sections</span>
                  <span className="text-xs text-rm-trip-text-muted">
                    {page.pagesFetched ?? 1} page{(page.pagesFetched ?? 1) !== 1 ? "s" : ""}
                    {(page.pagesFailed ?? 0) > 0 ? ` - ${page.pagesFailed} failed` : ""}
                  </span>
                </div>
              ),
            },
            {
              key: "date",
              label: "Last Updated",
              className: "w-[23%]",
              render: (page) => (
                <div className="flex items-center gap-1.5 text-sm text-rm-trip-text-muted">
                  <Calendar className="h-3.5 w-3.5 text-gray-300" />
                  <span>{new Date(page.updatedAt).toLocaleString()}</span>
                </div>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              className: "w-[12%]",
              headerClassName: "text-right",
              render: (page) => (
                <div className="flex justify-end gap-1">
                  <button onClick={() => void vm.refetchPage(page).then(showResult)} disabled={vm.refetchingId === page.id} className="flex h-8 w-8 items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:bg-blue-50 hover:text-rm-trip-brand disabled:opacity-50" title="Refetch">
                    {vm.refetchingId === page.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => vm.requestDelete(page)} className="flex h-8 w-8 items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:bg-red-50 hover:text-rm-trip-state-error" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-rm-trip-smooth bg-gray-100">
                <Globe className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="font-rm-trip-heading font-bold text-rm-trip-text">No web pages yet</p>
                <p className="mt-1 text-sm text-rm-trip-text-muted">Go to Add Content and use the URL tab.</p>
              </div>
            </div>
          }
        />
      </PageContent>

      <Dialog open={!!vm.deleteTarget} onOpenChange={(open) => !open && vm.cancelDelete()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete web page?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-rm-trip-text-muted">
            This will permanently delete <span className="break-all font-semibold text-rm-trip-text">{vm.deleteTarget?.title || vm.deleteTarget?.url}</span> and its indexed content.
          </p>
          <DialogFooter>
            <button onClick={vm.cancelDelete} className="rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-rm-trip-text-muted">
              Cancel
            </button>
            <button onClick={() => void remove()} disabled={vm.deleting} className="flex items-center gap-2 rounded-rm-trip-smooth bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {vm.deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function showResult(result: { message?: string; errorMessage?: string }) {
  if (result.message) toast.success(result.message);
  if (result.errorMessage) toast.error(result.errorMessage);
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-rm-trip-smooth border border-gray-100 bg-white px-5 py-4">
      <p className="mb-2 text-xs font-semibold text-rm-trip-text-muted">{label}</p>
      <div className="min-w-0 truncate font-rm-trip-heading text-xl font-semibold text-rm-trip-brand">{value}</div>
    </div>
  );
}
