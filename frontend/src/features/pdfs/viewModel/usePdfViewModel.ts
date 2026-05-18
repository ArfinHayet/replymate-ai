import { useCallback, useEffect, useMemo, useState } from "react";
import type { PdfDocument } from "../model/entities/PdfDocument";
import { createPdfService } from "../model/services/createPdfService";
import type { PdfViewModel } from "./PdfViewModel";

export function usePdfViewModel(): PdfViewModel {
  const pdfService = useMemo(() => createPdfService(), []);
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<PdfDocument | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PdfDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPdfs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPdfs(await pdfService.listPdfs());
      return { success: true };
    } catch {
      const errorMessage = "Failed to load documents";
      setError(errorMessage);
      return { success: false, errorMessage };
    } finally {
      setLoading(false);
    }
  }, [pdfService]);

  useEffect(() => {
    void Promise.resolve().then(loadPdfs);
  }, [loadPdfs]);

  const openRename = (pdf: PdfDocument) => {
    setRenameTarget(pdf);
    setRenameValue(pdf.fileName);
  };

  const closeRename = () => setRenameTarget(null);
  const requestDelete = (pdf: PdfDocument) => setDeleteTarget(pdf);
  const cancelDelete = () => setDeleteTarget(null);

  const renamePdf = async () => {
    if (!renameTarget) return { success: false };
    setRenaming(true);
    try {
      await pdfService.renamePdf(renameTarget.id, renameValue);
      setRenameTarget(null);
      await loadPdfs();
      return { success: true, message: "Renamed successfully" };
    } catch {
      return { success: false, errorMessage: "Rename failed" };
    } finally {
      setRenaming(false);
    }
  };

  const deletePdf = async () => {
    if (!deleteTarget) return { success: false };
    setDeleting(true);
    try {
      await pdfService.deletePdf(deleteTarget.id);
      setDeleteTarget(null);
      await loadPdfs();
      return { success: true, message: "PDF deleted" };
    } catch {
      return { success: false, errorMessage: "Delete failed" };
    } finally {
      setDeleting(false);
    }
  };

  return {
    pdfs,
    loading,
    error,
    renameTarget,
    renameValue,
    renaming,
    deleteTarget,
    deleting,
    loadPdfs,
    openRename,
    closeRename,
    setRenameValue,
    renamePdf,
    requestDelete,
    cancelDelete,
    deletePdf,
  };
}
