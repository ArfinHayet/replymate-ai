import { Building2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Company } from "../../model/entities/Company";
import type { CompanyFormState } from "../../model/entities/CompanyFormState";

interface CompanyFormDialogProps {
  open: boolean;
  editTarget: Company | null;
  form: CompanyFormState;
  saving: boolean;
  canSave: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onShortDescriptionChange: (value: string) => void;
  onSave: () => void;
}

export function CompanyFormDialog({
  open,
  editTarget,
  form,
  saving,
  canSave,
  onClose,
  onNameChange,
  onShortDescriptionChange,
  onSave,
}: CompanyFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
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
              <DialogDescription className="text-xs text-rm-trip-text-muted mt-0.5">
                {editTarget ? "Update company details" : "Create a new company profile"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5 bg-white">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-rm-trip-text">Company Name</label>
            <input
              value={form.name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="For example: Acme Support"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-all duration-150 outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-rm-trip-text">Short Description</label>
            <textarea
              value={form.shortDescription}
              onChange={(event) => onShortDescriptionChange(event.target.value)}
              placeholder="A brief description of what the company does..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-all duration-150 outline-none resize-none"
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 bg-white text-rm-trip-text-muted hover:text-rm-trip-text font-semibold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !canSave}
            className="flex-1 flex items-center justify-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-rm-trip-on-brand font-bold py-2.5 px-4 rounded-rm-trip-smooth shadow-rm-trip-glow transition-all duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editTarget ? "Save Changes" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
