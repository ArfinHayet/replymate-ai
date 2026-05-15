import { useEffect, useState } from "react";
import { Calendar, ImageIcon, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { listImages, updateImage, deleteImage, type ImageItem } from "@/lib/api";

export function ImagesPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [editTarget, setEditTarget] = useState<ImageItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editing, setEditing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ImageItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setImages(await listImages());
    } catch {
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  const openEdit = (image: ImageItem) => {
    setEditTarget(image);
    setEditTitle(image.title);
    setEditDescription(image.description);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditing(true);
    try {
      await updateImage(editTarget.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      toast.success("Image updated");
      setEditTarget(null);
      void load();
    } catch {
      toast.error("Update failed");
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteImage(deleteTarget.id);
      toast.success("Image deleted");
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
      <div className="mx-auto px-4 py-6 space-y-6 sm:px-8 sm:py-8">
        <div className="sticky top-0 z-10 -mx-4 bg-white px-4 py-5 shadow-rm-trip-card border-b border-gray-100 sm:-mx-8 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text leading-tight">Images</h1>
              <p className="text-rm-trip-text-muted text-sm mt-0.5">
                {loading ? "Loading..." : `${images.length} image${images.length !== 1 ? "s" : ""}`} in the knowledge
                base
              </p>
            </div>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-rm-trip-text-muted shadow-sm transition-all hover:border-gray-300 hover:text-rm-trip-text disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-rm-trip-smooth border border-gray-100 bg-white px-5 py-4 shadow-rm-trip-card">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted">Total Images</p>
            <p className="font-rm-trip-heading text-2xl font-bold text-rm-trip-brand">
              {loading ? <Skeleton className="h-7 w-8" /> : images.length}
            </p>
          </div>
          <div className="rounded-rm-trip-smooth border border-gray-100 bg-white px-5 py-4 shadow-rm-trip-card">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted">Latest Image</p>
            <p className="truncate font-rm-trip-heading text-base font-bold text-rm-trip-text">
              {loading ? <Skeleton className="h-6 w-32" /> : (images[0]?.title ?? "None yet")}
            </p>
          </div>
          <div className="rounded-rm-trip-smooth border border-gray-100 bg-white px-5 py-4 shadow-rm-trip-card">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted">Last Added</p>
            <p className="font-rm-trip-heading text-base font-bold text-rm-trip-text">
              {loading ? (
                <Skeleton className="h-6 w-28" />
              ) : images[0] ? (
                new Date(images[0].createdAt).toLocaleDateString()
              ) : (
                "None yet"
              )}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-rm-trip-smooth border border-gray-100 bg-white shadow-rm-trip-card">
          <div className="hidden grid-cols-[84px_1.3fr_2fr_1.3fr_92px] gap-4 border-b border-gray-100 bg-gray-50/80 px-6 py-3.5 md:grid">
            {["Preview", "Title", "Description", "Uploaded At", "Actions"].map((heading, index) => (
              <p
                key={heading}
                className={`text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted ${index === 4 ? "text-right" : ""}`}
              >
                {heading}
              </p>
            ))}
          </div>

          {loading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-3 border-b border-gray-50 px-5 py-4 md:grid-cols-[84px_1.3fr_2fr_1.3fr_92px] md:items-center md:gap-4 md:px-6"
              >
                <Skeleton className="h-12 w-12 rounded-rm-trip-smooth" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16 md:ml-auto" />
              </div>
            ))}

          {!loading && images.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-rm-trip-smooth bg-gray-100">
                <ImageIcon className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="font-rm-trip-heading font-bold text-rm-trip-text">No images uploaded yet</p>
                <p className="mt-1 text-sm text-rm-trip-text-muted">Use the Upload page to add visual knowledge.</p>
              </div>
            </div>
          )}

          {!loading &&
            images.map((img) => (
              <div
                key={img.id}
                className="grid gap-3 border-b border-gray-50 px-5 py-4 last:border-0 transition-colors hover:bg-blue-50/20 md:grid-cols-[84px_1.3fr_2fr_1.3fr_92px] md:items-center md:gap-4 md:px-6"
              >
                <img
                  src={img.storageUrl}
                  alt={img.title}
                  className="h-14 w-14 rounded-rm-trip-smooth border border-gray-100 object-cover shadow-sm"
                />
                <p className="min-w-0 truncate text-sm font-semibold text-rm-trip-text">{img.title}</p>
                <p className="line-clamp-2 text-sm leading-relaxed text-rm-trip-text-muted md:truncate">
                  {img.description}
                </p>
                <div className="flex items-center gap-1.5 text-sm text-rm-trip-text-muted">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  <span>{new Date(img.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => openEdit(img)}
                    className="flex h-8 w-8 items-center justify-center rounded-rm-trip-smooth border border-transparent text-rm-trip-text-muted transition-all hover:border-blue-200 hover:bg-blue-100 hover:text-rm-trip-brand"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(img)}
                    className="flex h-8 w-8 items-center justify-center rounded-rm-trip-smooth border border-transparent text-rm-trip-text-muted transition-all hover:border-red-200 hover:bg-red-50 hover:text-rm-trip-state-error"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-gray-100 bg-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand/10">
                <Pencil className="h-5 w-5 text-rm-trip-brand" />
              </div>
              <div>
                <DialogTitle>Edit Image</DialogTitle>
                <p className="mt-0.5 text-xs text-rm-trip-text-muted">Update the searchable title and description.</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 bg-white px-6 py-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-rm-trip-text">Title</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Image title"
                className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-rm-trip-text outline-none transition-all focus-rm-trip-highlight focus:bg-white placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-rm-trip-text">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Image description"
                rows={4}
                className="w-full resize-none rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-rm-trip-text outline-none transition-all focus-rm-trip-highlight focus:bg-white placeholder:text-gray-400"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 bg-gray-50/60 px-6 py-4">
            <button
              onClick={() => setEditTarget(null)}
              className="flex-1 rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-rm-trip-text-muted transition-all hover:text-rm-trip-text"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleEdit()}
              disabled={editing || !editTitle.trim() || !editDescription.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-2.5 text-sm font-bold text-white shadow-rm-trip-glow transition-all hover:bg-rm-trip-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editing && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-gray-100 bg-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-rm-trip-smooth border border-red-100 bg-red-50">
                <Trash2 className="h-5 w-5 text-rm-trip-state-error" />
              </div>
              <DialogTitle>Delete Image?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="bg-white px-6 py-5">
            <p className="text-sm leading-relaxed text-rm-trip-text-muted">
              This will permanently delete <span className="font-bold text-rm-trip-text">{deleteTarget?.title}</span>{" "}
              from the knowledge base. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="border-t border-gray-100 bg-gray-50/60 px-6 py-4">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-rm-trip-text-muted transition-all hover:text-rm-trip-text"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="flex flex-1 items-center justify-center gap-2 rounded-rm-trip-smooth bg-rm-trip-state-error px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
