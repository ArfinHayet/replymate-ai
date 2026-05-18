import { useCallback, useEffect, useMemo, useState } from "react";
import type { KnowledgeImage } from "../model/entities/KnowledgeImage";
import { createImageService } from "../model/services/createImageService";
import type { ImagesViewModel } from "./ImagesViewModel";

export function useImagesViewModel(): ImagesViewModel {
  const imageService = useMemo(() => createImageService(), []);
  const [images, setImages] = useState<KnowledgeImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<KnowledgeImage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeImage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setImages(await imageService.listImages());
      return { success: true };
    } catch {
      const errorMessage = "Failed to load images";
      setError(errorMessage);
      return { success: false, errorMessage };
    } finally {
      setLoading(false);
    }
  }, [imageService]);

  useEffect(() => {
    void Promise.resolve().then(loadImages);
  }, [loadImages]);

  const openEdit = (image: KnowledgeImage) => {
    setEditTarget(image);
    setEditTitle(image.title);
    setEditDescription(image.description);
  };

  const closeEdit = () => setEditTarget(null);
  const requestDelete = (image: KnowledgeImage) => setDeleteTarget(image);
  const cancelDelete = () => setDeleteTarget(null);

  const updateImage = async () => {
    if (!editTarget) return { success: false };
    setEditing(true);
    try {
      await imageService.updateImage(editTarget.id, {
        title: editTitle,
        description: editDescription,
      });
      setEditTarget(null);
      await loadImages();
      return { success: true, message: "Image updated" };
    } catch {
      return { success: false, errorMessage: "Update failed" };
    } finally {
      setEditing(false);
    }
  };

  const deleteImage = async () => {
    if (!deleteTarget) return { success: false };
    setDeleting(true);
    try {
      await imageService.deleteImage(deleteTarget.id);
      setDeleteTarget(null);
      await loadImages();
      return { success: true, message: "Image deleted" };
    } catch {
      return { success: false, errorMessage: "Delete failed" };
    } finally {
      setDeleting(false);
    }
  };

  return {
    images,
    loading,
    error,
    editTarget,
    editTitle,
    editDescription,
    editing,
    deleteTarget,
    deleting,
    loadImages,
    openEdit,
    closeEdit,
    setEditTitle,
    setEditDescription,
    updateImage,
    requestDelete,
    cancelDelete,
    deleteImage,
  };
}
