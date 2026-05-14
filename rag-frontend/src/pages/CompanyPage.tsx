import { useEffect, useState } from "react";
import { Pencil, Trash2, Loader2, Building2, Plus, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { listCompanies, createCompany, updateCompany, deleteCompany, type Company } from "@/lib/api";

type FormState = { name: string; shortDescription: string };
const empty: FormState = { name: "", shortDescription: "" };

export function CompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setCompanies(await listCompanies());
    } catch {
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(empty);
    setFormOpen(true);
  };
  const openEdit = (c: Company) => {
    setEditTarget(c);
    setForm({ name: c.name, shortDescription: c.shortDescription });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.shortDescription.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateCompany(editTarget.id, form);
        toast.success("Company updated");
      } else {
        await createCompany(form);
        toast.success("Company created");
      }
      setFormOpen(false);
      void load();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCompany(deleteTarget.id);
      toast.success("Company deleted");
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
              <h1 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text leading-tight">
                Company Profile
              </h1>
              <p className="text-rm-trip-text-muted text-sm mt-0.5">
                The <span className="font-semibold text-rm-trip-state-success">Active</span> company is injected into
                the chatbot's system prompt on every request.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => void load()}
                disabled={loading}
                className="flex items-center gap-2 border border-gray-200 bg-white text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-bold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-glow transition-all duration-150 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Company
              </button>
            </div>
          </div>
        </div>
        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-card px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted mb-2">Total Companies</p>
            <p className="font-rm-trip-heading font-bold text-2xl text-rm-trip-brand">
              {loading ? <Skeleton className="h-7 w-8" /> : companies.length}
            </p>
          </div>
          <div className="bg-white rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-card px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted mb-2">Active Profile</p>
            <p className="font-rm-trip-heading font-bold text-base text-rm-trip-state-success truncate">
              {loading ? <Skeleton className="h-6 w-32" /> : (companies[0]?.name ?? "—")}
            </p>
          </div>
          <div className="bg-white rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-card px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted mb-2">Last Updated</p>
            <p className="font-rm-trip-heading font-bold text-base text-rm-trip-text">
              {loading ? (
                <Skeleton className="h-6 w-28" />
              ) : companies[0] ? (
                new Date(companies[0].updatedAt).toLocaleDateString()
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        {/* ── Table card ── */}
        <div className="bg-white rounded-rm-trip-smooth shadow-rm-trip-card border border-gray-100 overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_3fr_2fr_80px] px-6 py-3.5 bg-gray-50/80 border-b border-gray-100">
            {["Company Name", "Short Description", "Last Updated", "Actions"].map((h, i) => (
              <p
                key={h}
                className={`text-xs font-bold uppercase tracking-widest text-rm-trip-text-muted ${i === 3 ? "text-right" : ""}`}
              >
                {h}
              </p>
            ))}
          </div>

          {/* Loading rows */}
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[2fr_3fr_2fr_80px] px-6 py-4 border-b border-gray-50 items-center gap-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-rm-trip-smooth shrink-0" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}

          {/* Empty state */}
          {!loading && companies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-16 w-16 rounded-rm-trip-smooth bg-gray-100 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="font-rm-trip-heading font-bold text-rm-trip-text">No company profile yet</p>
                <p className="text-rm-trip-text-muted text-sm mt-1">Add one to give the chatbot a company identity</p>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-bold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-glow text-sm transition-all duration-150"
              >
                <Plus className="h-4 w-4" /> Add Company
              </button>
            </div>
          )}

          {/* Data rows */}
          {!loading &&
            companies.map((c, idx) => (
              <div
                key={c.id}
                className={`grid grid-cols-[2fr_3fr_2fr_80px] px-6 py-4 items-center border-b border-gray-50 last:border-0 transition-colors duration-100 group cursor-default
                ${idx === 0 ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-blue-50/20"}`}
              >
                {/* Name + avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-rm-trip-smooth flex items-center justify-center shrink-0 font-bold text-sm
                  ${idx === 0 ? "bg-rm-trip-brand text-white shadow-rm-trip-card" : "bg-gray-100 text-rm-trip-text-muted"}`}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <p className="font-semibold text-rm-trip-text text-sm truncate leading-tight">{c.name}</p>
                    {idx === 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-white bg-rm-trip-state-success px-2 py-0.5 rounded-rm-trip-pill">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-rm-trip-text-muted text-sm truncate pr-6">{c.shortDescription}</p>

                {/* Date */}
                <div className="flex items-center gap-1.5 text-rm-trip-text-muted text-sm">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  <span>{new Date(c.updatedAt).toLocaleString()}</span>
                </div>

                {/* Actions — reveal on hover */}
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={() => openEdit(c)}
                    className="h-8 w-8 flex items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:text-rm-trip-brand hover:bg-blue-100 border border-transparent hover:border-blue-200 transition-all duration-150"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
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

      {/* ── Create / Edit dialog ── */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="p-0 gap-0 rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-lift overflow-hidden max-w-md">
          <DialogHeader className="px-6 py-5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-rm-trip-smooth bg-rm-trip-brand/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-rm-trip-brand" />
              </div>
              <div>
                <DialogTitle className="font-rm-trip-heading font-bold text-rm-trip-text leading-tight">
                  {editTarget ? "Edit Company" : "Add Company"}
                </DialogTitle>
                <p className="text-xs text-rm-trip-text-muted mt-0.5">
                  {editTarget ? "Update company details" : "Create a new company profile"}
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5 bg-white">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-rm-trip-text">Company Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Kaz Software"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-all duration-150 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-rm-trip-text">Short Description</label>
              <textarea
                value={form.shortDescription}
                onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                placeholder="A brief description of what the company does…"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-all duration-150 outline-none resize-none"
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex gap-2">
            <button
              onClick={() => setFormOpen(false)}
              className="flex-1 border border-gray-200 bg-white text-rm-trip-text-muted hover:text-rm-trip-text font-semibold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !form.name.trim() || !form.shortDescription.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-bold py-2.5 px-4 rounded-rm-trip-smooth shadow-rm-trip-glow transition-all duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? "Save Changes" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="p-0 gap-0 rounded-rm-trip-smooth border border-gray-100 shadow-rm-trip-lift overflow-hidden max-w-md">
          <DialogHeader className="px-6 py-5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-rm-trip-smooth bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-rm-trip-state-error" />
              </div>
              <DialogTitle className="font-rm-trip-heading font-bold text-rm-trip-text">Delete Company?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-6 py-5 bg-white">
            <p className="text-sm text-rm-trip-text-muted leading-relaxed">
              This will permanently delete <span className="font-bold text-rm-trip-text">{deleteTarget?.name}</span>.{" "}
              The chatbot will no longer have a company identity until another profile is added.
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
