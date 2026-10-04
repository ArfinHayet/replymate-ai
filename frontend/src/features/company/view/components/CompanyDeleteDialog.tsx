import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Company } from "../../model/entities/Company";

interface CompanyDeleteDialogProps {
  deleteTarget: Company | null;
  deleting: boolean;
  onCancel: () => void;
  onDelete: () => void;
}

export function CompanyDeleteDialog({ deleteTarget, deleting, onCancel, onDelete }: CompanyDeleteDialogProps) {
  return (
    <Dialog open={!!deleteTarget} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
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
          <DialogDescription className="text-sm text-rm-trip-text-muted leading-relaxed">
            This will permanently delete <span className="font-bold text-rm-trip-text">{deleteTarget?.name}</span>. The
            chatbot will no longer have a company identity until another profile is added.
          </DialogDescription>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 bg-white text-rm-trip-text-muted hover:text-rm-trip-text font-semibold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 bg-rm-trip-state-error hover:bg-red-700 text-rm-trip-on-brand font-bold py-2.5 px-4 rounded-rm-trip-smooth transition-all duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
