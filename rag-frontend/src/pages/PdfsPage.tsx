import { useEffect, useState } from "react";
import { Pencil, Trash2, Loader2, Files, RefreshCw, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { listPdfs, renamePdf, deletePdf, type Pdf } from "@/lib/api";

export function PdfsPage() {
  const [pdfs, setPdfs] = useState<Pdf[]>([]);
  const [loading, setLoading] = useState(true);

  const [renameTarget, setRenameTarget] = useState<Pdf | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Pdf | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setPdfs(await listPdfs());
    } catch {
      toast.error("Failed to load PDFs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openRename = (pdf: Pdf) => {
    setRenameTarget(pdf);
    setRenameValue(pdf.fileName);
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    setRenaming(true);
    try {
      await renamePdf(renameTarget.id, renameValue.trim());
      toast.success("Renamed successfully");
      setRenameTarget(null);
      void load();
    } catch {
      toast.error("Rename failed");
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePdf(deleteTarget.id);
      toast.success("PDF and its chunks deleted");
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
      {/* ── Sticky top bar ── */}

      {/* ── Page body ── */}
      <div className="mx-auto px-8 py-8 space-y-6">
        <div className="bg-white border-b border-gray-100 shadow-rm-trip-card px-8 py-5 sticky top-0 z-10">
          <div className="mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text leading-tight">Uploaded PDFs</h1>
              <p className="text-rm-trip-text-muted text-sm mt-0.5">
                {loading ? "…" : `${pdfs.length} document${pdfs.length !== 1 ? "s" : ""}`} in the knowledge base
              </p>
            </div>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-2 border border-gray-200 bg-white text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-card px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted mb-2">Total Documents</p>
            <p className="font-rm-trip-heading font-bold text-2xl text-rm-trip-brand">
              {loading ? <Skeleton className="h-7 w-8" /> : pdfs.length}
            </p>
          </div>
          <div className="bg-white rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-card px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted mb-2">Latest Upload</p>
            <p className="font-rm-trip-heading font-bold text-base text-rm-trip-text truncate">
              {loading ? <Skeleton className="h-6 w-32" /> : (pdfs[0]?.fileName ?? "—")}
            </p>
          </div>
          <div className="bg-white rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-card px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted mb-2">Last Added</p>
            <p className="font-rm-trip-heading font-bold text-base text-rm-trip-text">
              {loading ? (
                <Skeleton className="h-6 w-28" />
              ) : pdfs[0] ? (
                new Date(pdfs[0].createdAt).toLocaleDateString()
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        {/* ── Table card ── */}
        <div className="bg-white rounded-rm-trip-smooth shadow-rm-trip-card border border-gray-100 overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[3fr_2fr_80px] px-6 py-3.5 bg-gray-50/80 border-b border-gray-100">
            {["File Name", "Uploaded At", "Actions"].map((h, i) => (
              <p
                key={h}
                className={`text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted ${i === 2 ? "text-right" : ""}`}
              >
                {h}
              </p>
            ))}
          </div>

          {/* Loading rows */}
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[3fr_2fr_80px] px-6 py-4 border-b border-gray-50 items-center gap-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-rm-trip-smooth shrink-0" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}

          {/* Empty state */}
          {!loading && pdfs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-16 w-16 rounded-rm-trip-smooth bg-gray-100 flex items-center justify-center">
                <Files className="h-8 w-8 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="font-rm-trip-heading font-bold text-rm-trip-text">No PDFs uploaded yet</p>
                <p className="text-rm-trip-text-muted text-sm mt-1">Use the Upload page to add documents</p>
              </div>
            </div>
          )}

          {/* Data rows */}
          {!loading &&
            pdfs.map((pdf, idx) => (
              <div
                key={pdf.id}
                className="grid grid-cols-[3fr_2fr_80px] px-6 py-4 items-center border-b border-gray-50 last:border-0 hover:bg-blue-50/20 transition-colors duration-100 group cursor-default"
              >
                {/* File name + icon */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-rm-trip-smooth flex items-center justify-center shrink-0
                  ${idx === 0 ? "bg-rm-trip-brand text-white shadow-rm-trip-card" : "bg-gray-100 text-rm-trip-text-muted"}`}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <p className="font-semibold text-rm-trip-text text-sm truncate">{pdf.fileName}</p>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1.5 text-rm-trip-text-muted text-sm">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  <span>{new Date(pdf.createdAt).toLocaleString()}</span>
                </div>

                {/* Actions — reveal on hover */}
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={() => openRename(pdf)}
                    className="h-8 w-8 flex items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:text-rm-trip-brand hover:bg-blue-100 border border-transparent hover:border-blue-200 transition-all duration-150"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(pdf)}
                    className="h-8 w-8 flex items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:text-rm-trip-state-error hover:bg-red-50 border border-transparent hover:border-red-200 transition-all duration-150"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ── Rename dialog ── */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="p-0 gap-0 rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-lift overflow-hidden max-w-md">
          <DialogHeader className="px-6 py-5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-rm-trip-smooth bg-rm-trip-brand/10 flex items-center justify-center shrink-0">
                <Pencil className="h-5 w-5 text-rm-trip-brand" />
              </div>
              <div>
                <DialogTitle className="font-rm-trip-heading font-bold text-rm-trip-text leading-tight">
                  Rename PDF
                </DialogTitle>
                <p className="text-xs text-rm-trip-text-muted mt-0.5">Update the display name for this document</p>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 py-5 bg-white">
            <label className="block text-sm font-bold text-rm-trip-text mb-1.5">File Name</label>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleRename()}
              placeholder="New file name"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-all duration-150 outline-none"
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex gap-2">
            <button
              onClick={() => setRenameTarget(null)}
              className="flex-1 border border-gray-200 bg-white text-rm-trip-text-muted hover:text-rm-trip-text font-semibold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleRename()}
              disabled={renaming || !renameValue.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-bold py-2.5 px-4 rounded-rm-trip-smooth shadow-rm-trip-glow transition-all duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {renaming && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="p-0 gap-0 rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-lift overflow-hidden max-w-md">
          <DialogHeader className="px-6 py-5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-rm-trip-smooth bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-rm-trip-state-error" />
              </div>
              <DialogTitle className="font-rm-trip-heading font-bold text-rm-trip-text">Delete PDF?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-6 py-5 bg-white">
            <p className="text-sm text-rm-trip-text-muted leading-relaxed">
              This will permanently delete <span className="font-bold text-rm-trip-text">{deleteTarget?.fileName}</span>{" "}
              and all its document chunks from the knowledge base. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 border border-gray-200 bg-white text-rm-trip-text-muted hover:text-rm-trip-text font-semibold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 bg-rm-trip-state-error hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
