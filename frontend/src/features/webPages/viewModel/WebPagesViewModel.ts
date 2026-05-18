import type { KnowledgeWebPage } from "../model/entities/KnowledgeWebPage";

export interface WebPagesActionResult {
  success: boolean;
  message?: string;
  errorMessage?: string;
}

export interface WebPagesViewModel {
  pages: KnowledgeWebPage[];
  loading: boolean;
  error: string | null;
  refetchingId: string | null;
  deleteTarget: KnowledgeWebPage | null;
  deleting: boolean;
  loadPages(): Promise<WebPagesActionResult>;
  refetchPage(page: KnowledgeWebPage): Promise<WebPagesActionResult>;
  requestDelete(page: KnowledgeWebPage): void;
  cancelDelete(): void;
  deletePage(): Promise<WebPagesActionResult>;
}
