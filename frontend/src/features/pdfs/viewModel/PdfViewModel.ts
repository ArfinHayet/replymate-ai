import type { PdfDocument } from "../model/entities/PdfDocument";

export interface PdfActionResult {
  success: boolean;
  message?: string;
  errorMessage?: string;
}

export interface PdfViewModel {
  pdfs: PdfDocument[];
  loading: boolean;
  error: string | null;
  renameTarget: PdfDocument | null;
  renameValue: string;
  renaming: boolean;
  deleteTarget: PdfDocument | null;
  deleting: boolean;
  loadPdfs(): Promise<PdfActionResult>;
  openRename(pdf: PdfDocument): void;
  closeRename(): void;
  setRenameValue(value: string): void;
  renamePdf(): Promise<PdfActionResult>;
  requestDelete(pdf: PdfDocument): void;
  cancelDelete(): void;
  deletePdf(): Promise<PdfActionResult>;
}
