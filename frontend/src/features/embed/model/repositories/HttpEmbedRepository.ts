import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import type { AllowedDomain, ChatToolConfig, WidgetKey } from "../entities/WidgetSettings";
import type { EmbedRepository } from "./EmbedRepository";

export class HttpEmbedRepository implements EmbedRepository {
  async listWidgetKeys(): Promise<WidgetKey[]> {
    const response = await api.get<WidgetKey[]>(apiRoutes.embed.widgetKeys);
    return response.data;
  }

  async createWidgetKey(label: string): Promise<WidgetKey> {
    const response = await api.post<WidgetKey>(apiRoutes.embed.widgetKeys, { label });
    return response.data;
  }

  async deleteWidgetKey(id: string): Promise<void> {
    await api.delete(apiRoutes.embed.widgetKeyById(id));
  }

  async listAllowedDomains(): Promise<AllowedDomain[]> {
    const response = await api.get<AllowedDomain[]>(apiRoutes.embed.allowedDomains);
    return response.data;
  }

  async createAllowedDomain(domain: string): Promise<AllowedDomain> {
    const response = await api.post<AllowedDomain>(apiRoutes.embed.allowedDomains, { domain });
    return response.data;
  }

  async deleteAllowedDomain(id: string): Promise<void> {
    await api.delete(apiRoutes.embed.allowedDomainById(id));
  }

  async listChatToolConfigs(): Promise<ChatToolConfig[]> {
    const response = await api.get<ChatToolConfig[]>(apiRoutes.chatTools.list);
    return response.data;
  }
}
