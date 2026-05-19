import type { ReactNode } from "react";
import { Calendar, ImageIcon, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/skeleton";
import { useImagesViewModel } from "../../viewModel/useImagesViewModel";

export function ImagesPage() {
  const vm = useImagesViewModel();

  const refresh = async () => showResult(await vm.loadImages());
  const save = async () => showResult(await vm.updateImage());
  const remove = async () => showResult(await vm.deleteImage());

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader
        title="Images"
        subtitle={vm.loading ? "Loading..." : `${vm.images.length} image${vm.images.length !== 1 ? "s" : ""} available to your assistant`}
      >
        <button
          onClick={() => void refresh()}
          disabled={vm.loading}
          className="inline-flex items-center gap-2 rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-rm-trip-text-muted shadow-sm transition-all hover:text-rm-trip-text disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${vm.loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </PageHeader>

      <PageContent>
        {vm.error && !vm.loading && (
          <InlineError
            title="Could not load images"
            message="Your saved images are unavailable right now."
            onRetry={() => void refresh()}
            retrying={vm.loading}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total Images" value={vm.loading ? <Skeleton className="h-7 w-8" /> : vm.images.length} />
          <Stat label="Latest Image" value={vm.loading ? <Skeleton className="h-6 w-32" /> : vm.images[0]?.title ?? "None yet"} />
          <Stat
            label="Last Added"
            value={vm.loading ? <Skeleton className="h-6 w-28" /> : vm.images[0] ? new Date(vm.images[0].createdAt).toLocaleDateString() : "None yet"}
          />
        </div>

        <DataTable
          data={vm.images}
          isLoading={vm.loading}
          getRowKey={(image) => image.id}
          columns={[
            {
              key: "preview",
              label: "Preview",
              render: (image) => <img src={image.storageUrl} alt={image.title} className="h-14 w-14 rounded-rm-trip-smooth border border-gray-100 object-cover shadow-sm" />,
            },
            {
              key: "title",
              label: "Title",
              render: (image) => <p className="truncate text-sm font-semibold text-rm-trip-text">{image.title}</p>,
            },
            {
              key: "description",
              label: "Description",
              render: (image) => <p className="line-clamp-2 text-sm text-rm-trip-text-muted">{image.description}</p>,
            },
            {
              key: "date",
              label: "Uploaded At",
              render: (image) => (
                <div className="flex items-center gap-1.5 text-sm text-rm-trip-text-muted">
                  <Calendar className="h-3.5 w-3.5 text-gray-300" />
                  <span>{new Date(image.createdAt).toLocaleString()}</span>
                </div>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (image) => (
                <div className="flex gap-1">
                  <button onClick={() => vm.openEdit(image)} className="flex h-8 w-8 items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:bg-blue-100 hover:text-rm-trip-brand" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => vm.requestDelete(image)} className="flex h-8 w-8 items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:bg-red-50 hover:text-rm-trip-state-error" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-rm-trip-smooth bg-gray-100">
                <ImageIcon className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="font-rm-trip-heading font-bold text-rm-trip-text">No images uploaded yet</p>
                <p className="mt-1 text-sm text-rm-trip-text-muted">Use Add Content to upload images.</p>
              </div>
            </div>
          }
        />
      </PageContent>

      <Dialog open={!!vm.editTarget} onOpenChange={(open) => !open && vm.closeEdit()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input value={vm.editTitle} onChange={(event) => vm.setEditTitle(event.target.value)} className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus-rm-trip-highlight" />
            <textarea value={vm.editDescription} onChange={(event) => vm.setEditDescription(event.target.value)} rows={4} className="w-full resize-none rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus-rm-trip-highlight" />
          </div>
          <DialogFooter>
            <button onClick={vm.closeEdit} className="rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-rm-trip-text-muted">
              Cancel
            </button>
            <button onClick={() => void save()} disabled={vm.editing || !vm.editTitle.trim() || !vm.editDescription.trim()} className="flex items-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {vm.editing && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!vm.deleteTarget} onOpenChange={(open) => !open && vm.cancelDelete()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Image?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-rm-trip-text-muted">
            This will permanently delete <span className="font-bold text-rm-trip-text">{vm.deleteTarget?.title}</span>.
          </p>
          <DialogFooter>
            <button onClick={vm.cancelDelete} className="rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-rm-trip-text-muted">
              Cancel
            </button>
            <button onClick={() => void remove()} disabled={vm.deleting} className="flex items-center gap-2 rounded-rm-trip-smooth bg-rm-trip-state-error px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {vm.deleting && <Loader2 className="h-4 w-4 animate-spin" />}
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
    <div className="rounded-rm-trip-smooth border border-gray-100 bg-white px-5 py-4">
      <p className="mb-2 text-xs font-semibold text-rm-trip-text-muted">{label}</p>
      <div className="truncate font-rm-trip-heading text-xl font-semibold text-rm-trip-brand">{value}</div>
    </div>
  );
}
