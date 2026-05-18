import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import type { KnowledgeWebPage, RefetchedWebPage } from "../entities/KnowledgeWebPage";
import type { WebPageRepository } from "./WebPageRepository";

export class HttpWebPageRepository implements WebPageRepository {
  async list(): Promise<KnowledgeWebPage[]> {
    const response = await api.get<KnowledgeWebPage[]>(apiRoutes.webPages.list);
    return response.data;
  }

  async refetch(id: string): Promise<RefetchedWebPage> {
    const response = await api.post<RefetchedWebPage>(apiRoutes.webPages.refetch(id));
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(apiRoutes.webPages.byId(id));
  }
}
