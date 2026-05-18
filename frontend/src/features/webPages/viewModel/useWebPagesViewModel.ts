import { useCallback, useEffect, useMemo, useState } from "react";
import type { KnowledgeWebPage } from "../model/entities/KnowledgeWebPage";
import { createWebPageService } from "../model/services/createWebPageService";
import type { WebPagesViewModel } from "./WebPagesViewModel";

export function useWebPagesViewModel(): WebPagesViewModel {
  const webPageService = useMemo(() => createWebPageService(), []);
  const [pages, setPages] = useState<KnowledgeWebPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchingId, setRefetchingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeWebPage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPages(await webPageService.listWebPages());
      return { success: true };
    } catch {
      const errorMessage = "Failed to load web pages";
      setError(errorMessage);
      return { success: false, errorMessage };
    } finally {
      setLoading(false);
    }
  }, [webPageService]);

  useEffect(() => {
    void Promise.resolve().then(loadPages);
  }, [loadPages]);

  const refetchPage = async (page: KnowledgeWebPage) => {
    setRefetchingId(page.id);
    try {
      const result = await webPageService.refetchWebPage(page.id);
      setPages((prev) =>
        prev.map((item) =>
          item.id === page.id
            ? {
                ...item,
                title: result.title,
                chunksCreated: result.chunksCreated,
                pagesFetched: result.pagesFetched,
                pagesFailed: result.pagesFailed,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      return { success: true, message: `${result.chunksCreated} content sections updated` };
    } catch {
      return { success: false, errorMessage: "Refetch failed" };
    } finally {
      setRefetchingId(null);
    }
  };

  const requestDelete = (page: KnowledgeWebPage) => setDeleteTarget(page);
  const cancelDelete = () => setDeleteTarget(null);

  const deletePage = async () => {
    if (!deleteTarget) return { success: false };
    setDeleting(true);
    try {
      await webPageService.deleteWebPage(deleteTarget.id);
      setDeleteTarget(null);
      await loadPages();
      return { success: true, message: "Web page deleted" };
    } catch {
      return { success: false, errorMessage: "Delete failed" };
    } finally {
      setDeleting(false);
    }
  };

  return {
    pages,
    loading,
    error,
    refetchingId,
    deleteTarget,
    deleting,
    loadPages,
    refetchPage,
    requestDelete,
    cancelDelete,
    deletePage,
  };
}
