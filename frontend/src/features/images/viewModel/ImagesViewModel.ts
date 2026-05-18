import type { KnowledgeImage } from "../model/entities/KnowledgeImage";

export interface ImagesActionResult {
  success: boolean;
  message?: string;
  errorMessage?: string;
}

export interface ImagesViewModel {
  images: KnowledgeImage[];
  loading: boolean;
  error: string | null;
  editTarget: KnowledgeImage | null;
  editTitle: string;
  editDescription: string;
  editing: boolean;
  deleteTarget: KnowledgeImage | null;
  deleting: boolean;
  loadImages(): Promise<ImagesActionResult>;
  openEdit(image: KnowledgeImage): void;
  closeEdit(): void;
  setEditTitle(value: string): void;
  setEditDescription(value: string): void;
  updateImage(): Promise<ImagesActionResult>;
  requestDelete(image: KnowledgeImage): void;
  cancelDelete(): void;
  deleteImage(): Promise<ImagesActionResult>;
}
