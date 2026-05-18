import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import type { KnowledgeImage } from "../entities/KnowledgeImage";
import type { ImageRepository } from "./ImageRepository";

export class HttpImageRepository implements ImageRepository {
  async list(): Promise<KnowledgeImage[]> {
    const response = await api.get<KnowledgeImage[]>(apiRoutes.images.list);
    return response.data;
  }

  async update(id: string, data: { title: string; description: string }): Promise<KnowledgeImage> {
    const response = await api.patch<KnowledgeImage>(apiRoutes.images.byId(id), data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(apiRoutes.images.byId(id));
  }
}
