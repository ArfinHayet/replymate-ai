import { useEffect, useState } from "react";
import { Trash2, Loader2, Globe, RefreshCw, Calendar, RotateCcw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { listWebPages, refetchWebPage, deleteWebPage, type WebPage } from "@/lib/api";

export function WebPagesPage() {
  const [pages, setPages] = useState<WebPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetchingId, setRefetchingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<WebPage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setPages(await listWebPages());
    } catch {
      toast.error("Failed to load web pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  const handleRefetch = async (page: WebPage) => {
    setRefetchingId(page.id);
    try {
      const res = await refetchWebPage(page.id);
      toast.success(`Refetched — ${res.chunksCreated} chunks updated`);
      setPages((prev) =>
        prev.map((p) =>
          p.id === page.id
            ? {
                ...p,
                title: res.title,
                chunksCreated: res.chunksCreated,
                pagesFetched: res.pagesFetched,
                pagesFailed: res.pagesFailed,
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
    } catch {
      toast.error("Refetch failed");
    } finally {
      setRefetchingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWebPage(deleteTarget.id);
      toast.success("Web page and its chunks deleted");
      setDeleteTarget(null);
      void load();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader
        title="Ingested Web Pages"
        subtitle={loading ? "…" : `${pages.length} site${pages.length !== 1 ? "s" : ""} in the knowledge base`}
      >
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 border border-gray-200 bg-white text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </PageHeader>

      <div className="mx-auto px-8 py-8 space-y-6">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-white rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-card px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted mb-2">Sites</p>
            <p className="font-rm-trip-heading font-bold text-2xl text-rm-trip-brand">
              {loading ? <Skeleton className="h-7 w-8" /> : pages.length}
            </p>
          </div>
          <div className="bg-white rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-card px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted mb-2">Total Chunks</p>
            <p className="font-rm-trip-heading font-bold text-2xl text-rm-trip-brand">
              {loading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                pages.reduce((sum, p) => sum + p.chunksCreated, 0)
              )}
            </p>
          </div>
          <div className="bg-white rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-card px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted mb-2">Crawled Pages</p>
            <p className="font-rm-trip-heading font-bold text-2xl text-rm-trip-brand">
              {loading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                pages.reduce((sum, p) => sum + (p.pagesFetched ?? 1), 0)
              )}
            </p>
          </div>
          <div className="bg-white rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-card px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted mb-2">Last Ingested</p>
            <p className="font-rm-trip-heading font-bold text-base text-rm-trip-text truncate">
              {loading ? (
                <Skeleton className="h-6 w-28" />
              ) : pages[0] ? (
                new Date(pages[0].createdAt).toLocaleDateString()
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        {/* ── Table card ── */}
        <DataTable
          columns={[
            {
              key: "page",
              label: "Page",
              render: (page, idx) => (
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-rm-trip-smooth flex items-center justify-center shrink-0 ${
                      idx === 0 ? "bg-rm-trip-brand text-white shadow-rm-trip-card" : "bg-gray-100 text-rm-trip-text-muted"
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-rm-trip-text text-sm truncate">{page.title || page.url}</p>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-rm-trip-brand hover:underline truncate max-w-xs"
                    >
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
              render: (page) => (
                <div className="flex flex-col items-start gap-1">
                  <span className="inline-flex items-center rounded-full bg-blue-50 text-rm-trip-brand border border-blue-100 px-2.5 py-0.5 text-xs font-semibold">
                    {page.chunksCreated} chunks
                  </span>
                  <span className="text-xs text-rm-trip-text-muted">
                    {page.pagesFetched ?? 1} page{(page.pagesFetched ?? 1) !== 1 ? "s" : ""}
                    {(page.pagesFailed ?? 0) > 0 ? ` · ${page.pagesFailed} failed` : ""}
                  </span>
                </div>
              ),
            },
            {
              key: "date",
              label: "Last Updated",
              render: (page) => (
                <div className="flex items-center gap-1.5 text-rm-trip-text-muted text-sm">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  <span>{new Date(page.updatedAt).toLocaleString()}</span>
                </div>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (page) => (
                <div className="flex justify-start gap-1">
                  <button
                    onClick={() => void handleRefetch(page)}
                    disabled={refetchingId === page.id}
                    className="h-8 w-8 flex items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:text-rm-trip-brand hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all duration-150 disabled:opacity-50"
                    title="Refetch"
                  >
                    {refetchingId === page.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(page)}
                    className="h-8 w-8 flex items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:text-rm-trip-state-error hover:bg-red-50 border border-transparent hover:border-red-200 transition-all duration-150"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          data={pages}
          isLoading={loading}
          getRowKey={(page) => page.id}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-rm-trip-smooth bg-gray-100">
                <Globe className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="font-rm-trip-heading font-bold text-rm-trip-text">No web pages yet</p>
                <p className="mt-1 text-sm text-rm-trip-text-muted">Go to "Upload Knowledge" → URL tab to ingest your first web page.</p>
              </div>
            </div>
          }
        />
      </div>

      {/* ── Delete confirm dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete web page?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-rm-trip-text-muted">
            This will permanently delete{" "}
            <span className="font-semibold text-rm-trip-text break-all">{deleteTarget?.title || deleteTarget?.url}</span>{" "}
            and all its embedded chunks. This action cannot be undone.
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteTarget(null)}
              className="border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-text font-semibold py-2 px-4 rounded-rm-trip-smooth text-sm transition-colors bg-white"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-rm-trip-smooth text-sm transition-colors disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
